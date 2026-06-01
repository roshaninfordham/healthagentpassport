import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest
} from "fastify";
import { createAuditEvent, createPaymentReceipt } from "./audit.js";
import { bodyHash, signingBaseString, verifyText } from "./crypto.js";
import { checkDelegation } from "./consent.js";
import {
  emitBlocked,
  emitInfo,
  runStep,
  StudioEventSink,
  type EventEmitterContext
} from "./events.js";
import {
  extractPatientId,
  loadPolicy,
  type LoadedPolicy,
  matchDenyRule,
  matchRoutePolicy,
  resolvePolicyFile
} from "./policy.js";
import { runBehavioralSandbox } from "./sandbox.js";
import { evaluateTrust } from "./trust.js";
import type {
  AgentKeyFile,
  GatewayDecision,
  HealthAgentPolicy,
  PolicyRoute,
  SandboxDecision
} from "./types.js";

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

type GatewayOptions = {
  policyFile: string;
  upstream?: string;
  port?: number;
  studio?: string;
  demoDelayMs?: number;
};

type GatewayServer = {
  app: FastifyInstance;
  listen: (port?: number) => Promise<string>;
};

const nonceStore = new Set<string>();

function getHeader(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function getRequestBody(request: FastifyRequest): unknown {
  return request.body ?? {};
}

function defaultSandbox(agentId: string): SandboxDecision {
  return {
    mode: "mock",
    riskScore: 100,
    verdict: "block",
    signals: ["Sandbox did not run."],
    observedEvents: [{ type: "missing_sandbox", target: agentId, risk: "critical" }]
  };
}

function makeDecision(input: {
  runId: string;
  requestId: string;
  agentId: string;
  method: string;
  path: string;
  route?: PolicyRoute;
  signatureValid?: boolean;
  timestampFresh?: boolean;
  nonceFresh?: boolean;
  sandbox?: SandboxDecision;
  consent?: GatewayDecision["consent"];
  trust?: GatewayDecision["trust"];
  payment?: GatewayDecision["payment"];
  upstream?: GatewayDecision["upstream"];
  audit?: GatewayDecision["audit"];
  allowed: boolean;
  reason: string;
}): GatewayDecision {
  return {
    runId: input.runId,
    requestId: input.requestId,
    agentId: input.agentId,
    method: input.method,
    path: input.path,
    allowed: input.allowed,
    blockedBeforeUpstream: !input.upstream?.called,
    policy: input.route
      ? {
          routeId: input.route.id,
          requiredScopes: input.route.requiredScopes
        }
      : undefined,
    identity: {
      signatureValid: input.signatureValid ?? false,
      timestampFresh: input.timestampFresh ?? false,
      nonceFresh: input.nonceFresh ?? false
    },
    sandbox: input.sandbox ?? defaultSandbox(input.agentId),
    consent:
      input.consent ?? {
        valid: false,
        grantedScopes: [],
        missingScopes: input.route?.requiredScopes ?? []
      },
    trust:
      input.trust ?? {
        score: 0,
        tier: "C",
        route: "sandbox_only"
      },
    payment:
      input.payment ?? {
        mode: "mock",
        receiptId: "not-created",
        costMicros: 0
      },
    upstream: input.upstream ?? { called: false },
    audit:
      input.audit ?? {
        requestHash: bodyHash({ method: input.method, path: input.path }),
        auditId: "not-written"
      },
    reason: input.reason
  };
}

async function readAgent(loaded: LoadedPolicy, policy: HealthAgentPolicy, agentId: string) {
  const agentConfig = policy.agents[agentId];
  if (!agentConfig) {
    throw new Error(`Unknown agent ${agentId}.`);
  }

  return JSON.parse(
    await readFile(resolvePolicyFile(loaded, agentConfig.publicKeyFile), "utf8")
  ) as AgentKeyFile;
}

async function finalizeDecision(input: {
  ctx: EventEmitterContext;
  reply: FastifyReply;
  decision: GatewayDecision;
  httpStatus: number;
}) {
  await runStep(input.ctx, "write_audit_event", "Audit evidence written", async () => ({
    auditId: input.decision.audit.auditId,
    requestHash: input.decision.audit.requestHash,
    responseHash: input.decision.audit.responseHash
  }));

  await input.ctx.events.emit({
    runId: input.ctx.runId,
    requestId: input.ctx.requestId,
    phase: "return_response",
    label: input.decision.allowed
      ? `Returning HTTP ${input.httpStatus} to agent`
      : `Returning HTTP ${input.httpStatus} before upstream`,
    status: input.decision.allowed ? "passed" : "blocked",
    details: { decision: input.decision }
  });

  return input.reply.status(input.httpStatus).send({
    decision: input.decision,
    upstream: input.decision.upstream?.body
  });
}

async function handleRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  options: GatewayOptions
) {
  const requestId = randomUUID();
  const runId = getHeader(request, "x-hap-run-id") ?? randomUUID();
  const method = request.method.toUpperCase();
  const path = request.url;
  const body = getRequestBody(request);
  const agentId = getHeader(request, "x-agent-id") ?? "unknown-agent";
  const timestamp = getHeader(request, "x-agent-timestamp");
  const nonce = getHeader(request, "x-agent-nonce");
  const signature = getHeader(request, "x-agent-signature");
  const sandboxScenario = getHeader(request, "x-hap-sandbox-scenario");
  const events = new StudioEventSink(options.studio);
  const ctx: EventEmitterContext = {
    runId,
    requestId,
    events,
    demoDelayMs: options.demoDelayMs ?? 0
  };

  await runStep(ctx, "receive_request", "Incoming signed request received", async () => ({
    method,
    path,
    agentId
  }));

  const loaded = await runStep(ctx, "parse_policy", "healthagent.yaml policy loaded", async () =>
    loadPolicy(options.policyFile)
  );
  const policy = loaded.policy;
  const upstreamBase = options.upstream ?? policy.service.upstream;
  const denyRule = matchDenyRule(policy, method, path);
  const matched = denyRule ? null : matchRoutePolicy(policy, method, path);

  if (denyRule) {
    await emitBlocked(ctx, "match_route_policy", `Deny rule matched: ${denyRule.id}`, {
      reason: denyRule.reason
    });
  } else if (matched) {
    await runStep(ctx, "match_route_policy", `Policy matched: ${matched.route.id}`, async () => ({
      routeId: matched.route.id,
      requiredScopes: matched.route.requiredScopes
    }));
  } else {
    await emitBlocked(ctx, "match_route_policy", "No route policy matched", {
      path
    });
  }

  let agent: AgentKeyFile | null = null;
  let signatureValid = false;

  try {
    await runStep(ctx, "verify_agent_identity", "Ed25519 agent signature verified", async () => {
      if (!timestamp || !nonce || !signature) {
        throw new Error("Missing signed agent headers.");
      }

      const loadedAgent = await readAgent(loaded, policy, agentId);
      const base = signingBaseString({ method, path, body, timestamp, nonce });
      signatureValid = verifyText(loadedAgent.publicKeyPem, base, signature);
      agent = loadedAgent;

      if (!signatureValid) {
        throw new Error("Agent signature failed verification.");
      }

      return { agentId: loadedAgent.id, name: loadedAgent.name };
    });
  } catch (error) {
    const audit = createAuditEvent({ request: { method, path, body, agentId } });
    const decision = makeDecision({
      runId,
      requestId,
      agentId,
      method,
      path,
      signatureValid: false,
      allowed: false,
      reason: error instanceof Error ? error.message : "Agent identity failed.",
      audit
    });

    return finalizeDecision({ ctx, reply, decision, httpStatus: 401 });
  }

  if (!agent) {
    throw new Error("Agent identity failed to load.");
  }
  const verifiedAgent = agent;

  const timestampFresh = await runStep(ctx, "check_timestamp", "Request timestamp is fresh", async () => {
    if (!timestamp) return false;
    const timestampMs = Date.parse(timestamp);
    return Number.isFinite(timestampMs) && Math.abs(Date.now() - timestampMs) <= MAX_CLOCK_SKEW_MS;
  });

  const nonceFresh = await runStep(ctx, "check_nonce_replay", "Nonce replay check passed", async () => {
    if (!nonce) return false;
    const key = `${agentId}:${nonce}`;
    if (nonceStore.has(key)) return false;
    nonceStore.add(key);
    return true;
  });

  const sandbox = await runStep(
    ctx,
    "run_behavioral_sandbox",
    "Behavioral sandbox completed",
    async () =>
      runBehavioralSandbox({
        agentId,
        method,
        path,
        scenario: sandboxScenario
      })
  );

  for (const signal of sandbox.signals) {
    await emitInfo(ctx, "run_behavioral_sandbox", signal, {
      riskScore: sandbox.riskScore,
      verdict: sandbox.verdict
    });
  }

  const patientId = matched
    ? extractPatientId({
        route: matched.route,
        params: matched.params,
        body
      })
    : undefined;

  const consent = await runStep(
    ctx,
    "load_patient_delegation",
    patientId
      ? `Patient delegation loaded for ${patientId}`
      : "Patient context missing",
    async () =>
      matched
        ? checkDelegation({
            baseDir: loaded.baseDir,
            patientId,
            agentId,
            requiredScopes: matched.route.requiredScopes
          })
        : {
            valid: false,
            grantedScopes: [],
            missingScopes: [],
            reason: "No matched route policy."
          }
  );

  const scopesValid = await runStep(
    ctx,
    "check_required_scopes",
    consent.valid ? "Required SMART/FHIR scopes satisfied" : "Required scopes failed",
    async () => ({
      valid: consent.valid,
      grantedScopes: consent.grantedScopes,
      missingScopes: consent.missingScopes
    })
  );

  const trust = await runStep(ctx, "compute_trust_score", "Trust score and route computed", async () =>
    evaluateTrust({
      agent: verifiedAgent,
      signatureValid,
      delegationValid: consent.valid,
      sandbox
    })
  );

  const routePermitted =
    matched &&
    matched.route.trust.allowedRoutes.includes(trust.route) &&
    trust.score >= matched.route.trust.minScore &&
    sandbox.riskScore <= matched.route.sandbox.maxRiskScore;
  const blockedReason =
    denyRule?.reason ??
    (!matched
      ? "Unknown or disallowed endpoint."
      : !timestampFresh
        ? "Request timestamp is stale or invalid."
        : !nonceFresh
          ? "Replay detected: nonce already used."
          : sandbox.riskScore > matched.route.sandbox.maxRiskScore
            ? `Sandbox risk ${sandbox.riskScore}/100 exceeds policy maximum.`
            : !scopesValid.valid
              ? consent.reason
              : !routePermitted
                ? `Trust route ${trust.route} does not permit upstream access.`
                : "");

  const auditRequest = {
    method,
    path,
    body,
    agentId,
    requestId,
    policyRoute: matched?.route.id
  };

  if (blockedReason) {
    const audit = createAuditEvent({ request: auditRequest });
    const decision = makeDecision({
      runId,
      requestId,
      agentId,
      method,
      path,
      route: matched?.route,
      signatureValid,
      timestampFresh,
      nonceFresh,
      sandbox,
      consent,
      trust: {
        score: trust.score,
        tier: trust.tier,
        route: trust.route
      },
      allowed: false,
      reason: blockedReason,
      audit
    });

    await emitBlocked(ctx, "fetch_upstream_api", "Upstream API was NOT called", {
      blockedBeforeUpstream: true,
      reason: blockedReason
    });

    return finalizeDecision({ ctx, reply, decision, httpStatus: 403 });
  }

  const payment = await runStep(
    ctx,
    "create_payment_receipt",
    "Mock x402/MPP payment receipt created",
    async () => createPaymentReceipt({ agentId, path })
  );

  const upstreamUrl = new URL(path, upstreamBase).toString();
  const upstreamStartedAt = Date.now();
  const upstream = await runStep(ctx, "fetch_upstream_api", `Fetching real upstream API: ${method} ${upstreamUrl}`, async () => {
    const response = await fetch(upstreamUrl, {
      method,
      headers: {
        "content-type": "application/json",
        "x-healthagent-request-id": requestId
      },
      body: method === "GET" ? undefined : JSON.stringify(body)
    });
    const responseBody = await response.json().catch(() => null);

    return {
      called: true,
      url: upstreamUrl,
      status: response.status,
      latencyMs: Date.now() - upstreamStartedAt,
      body: responseBody
    };
  });

  const audit = await runStep(ctx, "hash_response", "Request and response hashes created", async () =>
    createAuditEvent({
      request: auditRequest,
      response: upstream.body
    })
  );

  const decision = makeDecision({
    runId,
    requestId,
    agentId,
    method,
    path,
    route: matched?.route,
    signatureValid,
    timestampFresh,
    nonceFresh,
    sandbox,
    consent,
    trust: {
      score: trust.score,
      tier: trust.tier,
      route: trust.route
    },
    payment,
    upstream,
    audit,
    allowed: upstream.status >= 200 && upstream.status < 300,
    reason:
      "Agent identity, sandbox behavior, patient delegation, scopes, trust route, payment, and audit checks passed."
  });

  return finalizeDecision({
    ctx,
    reply,
    decision,
    httpStatus: upstream.status ?? 200
  });
}

export function createGateway(options: GatewayOptions): GatewayServer {
  const app = Fastify({ logger: false });

  app.get("/health", async () => ({
    ok: true,
    service: "healthagent-passport-gateway"
  }));

  app.route({
    method: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    url: "/*",
    handler: (request, reply) => handleRequest(request, reply, options)
  });

  return {
    app,
    listen: async (port = options.port ?? 8787) =>
      app.listen({ port, host: "0.0.0.0" })
  };
}

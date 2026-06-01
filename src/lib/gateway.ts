import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import { bodyHash, sha256Hex, signingBaseString, verifyText } from "./crypto";
import { checkDelegation } from "./consent";
import { getSyntheticPatientBundle, submitPriorAuth } from "./fhir-service";
import { handlePaymentForApiCall, type PaymentResult } from "./payment";
import { findEndpointPolicy, isAllowedRoute } from "./policy";
import { evaluateTrust, type TrustProfile, type TrustRoute } from "./trust";
import type { SandboxReport } from "./sandbox/sandbox-types";

export type GatewayInput = {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  sandboxReport?: SandboxReport;
  headers: {
    "x-agent-id"?: string;
    "x-agent-timestamp"?: string;
    "x-agent-nonce"?: string;
    "x-agent-signature"?: string;
  };
};

export type GatewayDecision = "allow" | "deny" | "sandbox" | "throttle";

export type GatewayOutput = {
  requestId: string;
  allowed: boolean;
  httpStatus: number;
  decision: GatewayDecision;
  reason: string;
  data?: unknown;
  trust?: TrustProfile;
  payment?: PaymentResult;
  audit?: unknown;
};

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export async function handleGatewayRequest(
  input: GatewayInput
): Promise<GatewayOutput> {
  const startedAt = Date.now();
  const requestId = randomUUID();
  const method = input.method.toUpperCase() as "GET" | "POST";
  const path = input.path;
  const body = input.body ?? {};
  const sandboxReport = input.sandboxReport;

  const agentId = input.headers["x-agent-id"];
  const timestamp = input.headers["x-agent-timestamp"];
  const nonce = input.headers["x-agent-nonce"];
  const signature = input.headers["x-agent-signature"];
  const policy = findEndpointPolicy(method, path);
  const requestHash = sha256Hex(
    JSON.stringify({
      method,
      path,
      bodyHash: bodyHash(body),
      agentId,
      timestamp,
      nonce,
      sandboxRunId: sandboxReport?.id
    })
  );

  async function finish(params: {
    allowed: boolean;
    httpStatus: number;
    decision: GatewayDecision;
    route: TrustRoute;
    trustTier: string;
    trustScore: number;
    reason: string;
    patientId?: string | null;
    requiredScopes?: string[];
    grantedScopes?: string[];
    delegationHash?: string;
    data?: unknown;
    trust?: TrustProfile;
    payment?: PaymentResult;
    modelUsed?: string;
    toolCalls?: unknown[];
  }): Promise<GatewayOutput> {
    const latencyMs = Date.now() - startedAt;
    const responseHash = params.data
      ? sha256Hex(JSON.stringify(params.data))
      : null;

    const audit = await prisma.auditEvent.create({
      data: {
        id: randomUUID(),
        requestId,
        agentId: agentId ?? null,
        patientId: params.patientId ?? null,
        method,
        path,
        decision: params.decision,
        route: params.route,
        trustTier: params.trustTier,
        trustScore: params.trustScore,
        reason: params.reason,
        requiredScopesJson: JSON.stringify(params.requiredScopes ?? []),
        grantedScopesJson: params.grantedScopes
          ? JSON.stringify(params.grantedScopes)
          : null,
        httpStatus: params.httpStatus,
        latencyMs,
        costMicros: params.payment?.costMicros ?? 0,
        delegationHash: params.delegationHash ?? null,
        requestHash,
        responseHash,
        modelUsed: params.modelUsed ?? null,
        toolCallsJson: params.toolCalls ? JSON.stringify(params.toolCalls) : null,
        sandboxRunId: sandboxReport?.id ?? null,
        sandboxRiskScore: sandboxReport?.riskScore ?? null,
        sandboxVerdict: sandboxReport?.verdict ?? null
      }
    });

    return {
      requestId,
      allowed: params.allowed,
      httpStatus: params.httpStatus,
      decision: params.decision,
      reason: params.reason,
      data: params.data,
      trust: params.trust,
      payment: params.payment,
      audit
    };
  }

  if (!agentId || !timestamp || !nonce || !signature) {
    return finish({
      allowed: false,
      httpStatus: 401,
      decision: "deny",
      route: "sandbox_only",
      trustTier: "C",
      trustScore: 0,
      reason: "Missing required agent identity headers."
    });
  }

  const timestampMs = Date.parse(timestamp);
  if (
    !Number.isFinite(timestampMs) ||
    Math.abs(Date.now() - timestampMs) > MAX_CLOCK_SKEW_MS
  ) {
    return finish({
      allowed: false,
      httpStatus: 401,
      decision: "deny",
      route: "sandbox_only",
      trustTier: "C",
      trustScore: 0,
      reason: "Request timestamp is stale or invalid."
    });
  }

  const existingNonce = await prisma.nonce.findUnique({
    where: {
      agentId_nonce: {
        agentId,
        nonce
      }
    }
  });

  if (existingNonce) {
    return finish({
      allowed: false,
      httpStatus: 401,
      decision: "deny",
      route: "sandbox_only",
      trustTier: "C",
      trustScore: 0,
      reason: "Replay detected: nonce already used."
    });
  }

  await prisma.nonce.create({
    data: {
      agentId,
      nonce,
      expiresAt: new Date(Date.now() + MAX_CLOCK_SKEW_MS)
    }
  });

  const agent = await prisma.agentIdentity.findUnique({
    where: { id: agentId }
  });

  if (!agent) {
    return finish({
      allowed: false,
      httpStatus: 401,
      decision: "deny",
      route: "sandbox_only",
      trustTier: "C",
      trustScore: 0,
      reason: "Unknown agent identity."
    });
  }

  const base = signingBaseString({
    method,
    path,
    body,
    timestamp,
    nonce
  });
  const signatureValid = verifyText(agent.publicKeyPem, base, signature);

  if (!signatureValid) {
    const trust = await evaluateTrust({
      agent,
      signatureValid,
      delegationValid: false,
      sandboxReport
    });

    return finish({
      allowed: false,
      httpStatus: 401,
      decision: "deny",
      route: trust.route,
      trustTier: trust.tier,
      trustScore: trust.trustScore,
      trust,
      reason: "Agent request signature failed verification."
    });
  }

  if (!policy) {
    const trust = await evaluateTrust({
      agent,
      signatureValid,
      delegationValid: false,
      sandboxReport
    });

    return finish({
      allowed: false,
      httpStatus: 403,
      decision: "deny",
      route: trust.route,
      trustTier: trust.tier,
      trustScore: trust.trustScore,
      trust,
      reason: "Unknown or disallowed endpoint. Possible scraping or bulk access attempt."
    });
  }

  const patientId = policy.extractPatientId(path, body);

  if (!patientId) {
    const trust = await evaluateTrust({
      agent,
      signatureValid,
      delegationValid: false,
      sandboxReport
    });

    return finish({
      allowed: false,
      httpStatus: 400,
      decision: "deny",
      route: trust.route,
      trustTier: trust.tier,
      trustScore: trust.trustScore,
      trust,
      reason: "Could not determine patient context for scoped access.",
      requiredScopes: policy.requiredScopes
    });
  }

  const consent = await checkDelegation({
    patientId,
    agentId,
    requiredScopes: policy.requiredScopes
  });
  const trust = await evaluateTrust({
    agent,
    signatureValid,
    delegationValid: consent.valid,
    sandboxReport
  });

  if (!consent.valid) {
    return finish({
      allowed: false,
      httpStatus: 403,
      decision: "deny",
      route: trust.route,
      trustTier: trust.tier,
      trustScore: trust.trustScore,
      trust,
      reason: consent.reason,
      patientId,
      requiredScopes: policy.requiredScopes,
      grantedScopes: consent.grantedScopes,
      delegationHash: consent.delegationHash
    });
  }

  if (!isAllowedRoute(trust.route)) {
    return finish({
      allowed: false,
      httpStatus: 403,
      decision: trust.route === "sandbox" ? "sandbox" : "deny",
      route: trust.route,
      trustTier: trust.tier,
      trustScore: trust.trustScore,
      trust,
      reason: `Trust route ${trust.route} does not permit production access.`,
      patientId,
      requiredScopes: policy.requiredScopes,
      grantedScopes: consent.grantedScopes,
      delegationHash: consent.delegationHash,
      data:
        trust.route === "sandbox"
          ? { sandbox: true, message: "Sandbox route: protected data redacted." }
          : undefined
    });
  }

  const payment = await handlePaymentForApiCall({
    agentId,
    path,
    route: trust.route
  });

  let upstream;
  if (method === "GET" && path.startsWith("/fhir/patient/")) {
    upstream = await getSyntheticPatientBundle(patientId);
  } else if (method === "POST" && path === "/prior-auth") {
    upstream = await submitPriorAuth(body);
  } else {
    upstream = {
      status: 404,
      data: { error: "No upstream handler." }
    };
  }

  return finish({
    allowed: upstream.status >= 200 && upstream.status < 300,
    httpStatus: upstream.status,
    decision: trust.route === "prod_throttled" ? "throttle" : "allow",
    route: trust.route,
    trustTier: trust.tier,
    trustScore: trust.trustScore,
    trust,
    payment,
    reason: "Agent identity, sandbox behavior, patient delegation, scopes, trust route, and payment checks passed.",
    patientId,
    requiredScopes: policy.requiredScopes,
    grantedScopes: consent.grantedScopes,
    delegationHash: consent.delegationHash,
    data: {
      trust,
      payment,
      sandbox: sandboxReport,
      upstream: upstream.data
    }
  });
}

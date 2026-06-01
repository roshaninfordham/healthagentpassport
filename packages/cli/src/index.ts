#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Command } from "commander";
import {
  createGateway,
  makeEd25519KeyPair,
  sha256Hex,
  signAgentRequest,
  stableJson
} from "../../passport/src/index.js";

const program = new Command();
const userCwd = process.env.INIT_CWD ?? process.cwd();

function fromUserCwd(path: string) {
  return resolve(userCwd, path);
}

const trustedScopes = [
  "patient/Patient.read",
  "patient/Condition.read",
  "patient/MedicationRequest.read",
  "patient/Observation.read",
  "payer/PriorAuth.write"
];

async function writeJson(path: string, value: unknown) {
  const resolved = fromUserCwd(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(value, null, 2)}\n`);
}

function makeAgent(id: string, name: string, trust: Record<string, unknown>) {
  const keys = makeEd25519KeyPair();

  return {
    id,
    name,
    publicKeyPem: keys.publicKeyPem,
    privateKeyPem: keys.privateKeyPem,
    trust
  };
}

async function initProject() {
  const trusted = makeAgent("trusted-care-agent", "TrustedCareAgent", {
    identityScore: 100,
    onChainScore: 94,
    behaviorScore: 97,
    complianceScore: 96,
    defaultTier: "AAA"
  });
  const sketchy = makeAgent("sketchy-scraper-agent", "SketchyScraperAgent", {
    identityScore: 50,
    onChainScore: 12,
    behaviorScore: 18,
    complianceScore: 10,
    defaultTier: "C"
  });
  const delegationPayload = {
    version: "healthagent-passport/v1",
    patientId: "maya-001",
    agentId: "trusted-care-agent",
    scopes: trustedScopes,
    purpose: "care-admin-prior-auth-demo",
    expiresAt: "2030-01-01T00:00:00.000Z"
  };
  const delegationHash = sha256Hex(stableJson(delegationPayload));

  await writeJson(".hap/agents/trusted-care-agent.json", trusted);
  await writeJson(".hap/agents/sketchy-scraper-agent.json", sketchy);
  await writeJson(".hap/delegations/maya-trusted-care-agent.json", {
    ...delegationPayload,
    status: "active",
    delegationHash,
    solanaSignature: `mock-solana-anchor-${delegationHash.slice(0, 16)}`
  });

  console.log("Created .hap demo agents and delegation files.");
  console.log("Use the included healthagent.yaml policy or edit it for your API.");
}

async function runTrustedAgent(gateway: string, patient: string, runId?: string) {
  const path = `/fhir/patient/${patient}`;
  const signedRead = await signAgentRequest({
    agentKeyFile: fromUserCwd(".hap/agents/trusted-care-agent.json"),
    method: "GET",
    path,
    runId,
    sandboxScenario: "trusted"
  });

  const readResponse = await fetch(new URL(path, gateway), {
    headers: signedRead.headers
  });

  console.log(`GET ${path} -> HTTP ${readResponse.status}`);
  console.log(JSON.stringify(await readResponse.json(), null, 2));

  const priorAuthPath = "/prior-auth";
  const body = {
    patientId: patient,
    requestedService: "Cardiology specialist follow-up",
    payer: "Demo Health Plan"
  };
  const signedPriorAuth = await signAgentRequest({
    agentKeyFile: fromUserCwd(".hap/agents/trusted-care-agent.json"),
    method: "POST",
    path: priorAuthPath,
    body,
    runId,
    sandboxScenario: "trusted"
  });

  const priorAuthResponse = await fetch(new URL(priorAuthPath, gateway), {
    method: "POST",
    headers: {
      ...signedPriorAuth.headers,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  console.log(`POST ${priorAuthPath} -> HTTP ${priorAuthResponse.status}`);
  console.log(JSON.stringify(await priorAuthResponse.json(), null, 2));
}

async function runAttackAgent(gateway: string, runId?: string) {
  const path = "/fhir/all?dump=true";
  const signed = await signAgentRequest({
    agentKeyFile: fromUserCwd(".hap/agents/sketchy-scraper-agent.json"),
    method: "GET",
    path,
    runId,
    sandboxScenario: "attack"
  });

  const response = await fetch(new URL(path, gateway), {
    headers: signed.headers
  });

  console.log(`GET ${path} -> HTTP ${response.status}`);
  console.log(JSON.stringify(await response.json(), null, 2));
}

async function checkUrl(name: string, url: string) {
  try {
    const response = await fetch(url);
    console.log(`${name}: ${response.ok ? "online" : "unhealthy"} ${url}`);
  } catch {
    console.log(`${name}: offline ${url}`);
  }
}

program
  .name("healthagent")
  .description("HealthAgent Passport CLI")
  .version("0.1.0");

program
  .command("init")
  .description("Create demo healthagent.yaml support files and agent keys")
  .action(initProject);

program
  .command("gateway")
  .requiredOption("--policy <file>", "policy file", "./healthagent.yaml")
  .requiredOption("--upstream <url>", "upstream health API")
  .option("--port <port>", "gateway port", "8787")
  .option("--studio <url>", "Studio URL for live event streaming", "http://localhost:3000")
  .option("--demo-delay <ms>", "artificial demo delay per step", "650")
  .description("Start the HealthAgent Passport reverse proxy")
  .action(async (options) => {
    const gateway = createGateway({
      policyFile: fromUserCwd(options.policy),
      upstream: options.upstream,
      port: Number(options.port),
      studio: options.studio,
      demoDelayMs: Number(options.demoDelay)
    });
    const address = await gateway.listen(Number(options.port));
    console.log(`HealthAgent Passport gateway listening on ${address}`);
    console.log(`Forwarding approved requests to ${options.upstream}`);
  });

const agent = program.command("agent").description("Run signed demo agents");

agent
  .command("run <scenario>")
  .option("--gateway <url>", "gateway URL", "http://localhost:8787")
  .option("--patient <id>", "patient id", "maya-001")
  .option("--run-id <id>", "reuse a Studio run id")
  .description("Run trusted or attack scenario through the gateway")
  .action(async (scenario, options) => {
    const runId = options.runId ?? randomUUID();

    if (scenario === "trusted") {
      await runTrustedAgent(options.gateway, options.patient, runId);
      return;
    }

    if (scenario === "attack" || scenario === "sketchy") {
      await runAttackAgent(options.gateway, runId);
      return;
    }

    throw new Error("Scenario must be trusted or attack.");
  });

program
  .command("sign")
  .requiredOption("--agent <file>", "agent key file")
  .requiredOption("--method <method>", "HTTP method")
  .requiredOption("--path <path>", "request path")
  .description("Create signed HealthAgent request headers")
  .action(async (options) => {
    const signed = await signAgentRequest({
      agentKeyFile: fromUserCwd(options.agent),
      method: options.method,
      path: options.path
    });

    for (const [key, value] of Object.entries(signed.headers)) {
      console.log(`${key}: ${value}`);
    }
  });

program
  .command("doctor")
  .description("Check local demo dependencies")
  .action(async () => {
    console.log(`Node: ${process.version}`);
    await readFile(fromUserCwd("healthagent.yaml"), "utf8")
      .then(() => console.log("Policy: found ./healthagent.yaml"))
      .catch(() => console.log("Policy: missing ./healthagent.yaml"));
    await readFile(fromUserCwd(".hap/agents/trusted-care-agent.json"), "utf8")
      .then(() => console.log("Agent keys: found"))
      .catch(() => console.log("Agent keys: missing. Run healthagent init."));
    await checkUrl("Sample API", "http://localhost:4001/health");
    await checkUrl("Gateway", "http://localhost:8787/health");
    await checkUrl("Studio", "http://localhost:3000/api/health");
  });

program.parseAsync().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

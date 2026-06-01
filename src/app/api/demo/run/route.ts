import { createHash, randomUUID, sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { ingestRunEvent, type RunEvent } from "@/lib/live-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  scenario: z.enum(["trusted", "sketchy"])
});

type AgentKeyFile = {
  id: string;
  name: string;
  privateKeyPem: string;
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function signingBaseString(input: {
  method: string;
  path: string;
  body?: unknown;
  timestamp: string;
  nonce: string;
}) {
  return [
    input.method.toUpperCase(),
    input.path,
    sha256Hex(stableJson(input.body ?? {})),
    input.timestamp,
    input.nonce
  ].join("\n");
}

function makeEvent(input: Omit<RunEvent, "id" | "ts">): RunEvent {
  return {
    ...input,
    id: randomUUID(),
    ts: new Date().toISOString()
  };
}

function ingestLocalEvent(input: Omit<RunEvent, "id" | "ts">) {
  ingestRunEvent(makeEvent(input));
}

async function signHeaders(input: {
  agentFile: string;
  method: string;
  path: string;
  body?: unknown;
  runId: string;
  scenario: "trusted" | "attack";
}) {
  const agent = JSON.parse(await readFile(input.agentFile, "utf8")) as AgentKeyFile;
  const timestamp = new Date().toISOString();
  const nonce = randomUUID();
  const base = signingBaseString({
    method: input.method,
    path: input.path,
    body: input.body ?? {},
    timestamp,
    nonce
  });
  const signature = sign(null, Buffer.from(base), agent.privateKeyPem).toString(
    "base64"
  );

  return {
    "x-agent-id": agent.id,
    "x-agent-timestamp": timestamp,
    "x-agent-nonce": nonce,
    "x-agent-signature": signature,
    "x-hap-run-id": input.runId,
    "x-hap-sandbox-scenario": input.scenario
  };
}

async function sendGatewayRequest(input: {
  runId: string;
  agentFile: string;
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  scenario: "trusted" | "attack";
}) {
  const gatewayUrl = process.env.GATEWAY_URL ?? "http://localhost:8787";
  const headers = await signHeaders(input);
  const response = await fetch(new URL(input.path, gatewayUrl), {
    method: input.method,
    headers: {
      ...headers,
      ...(input.method === "POST" ? { "content-type": "application/json" } : {})
    },
    body: input.method === "GET" ? undefined : JSON.stringify(input.body ?? {})
  });

  await response.json().catch(() => null);
}

async function startDemoRunAsync(input: {
  runId: string;
  scenario: "trusted" | "sketchy";
}) {
  try {
    if (input.scenario === "trusted") {
      await sendGatewayRequest({
        runId: input.runId,
        agentFile: ".hap/agents/trusted-care-agent.json",
        method: "GET",
        path: "/fhir/patient/maya-001",
        scenario: "trusted"
      });
      await sendGatewayRequest({
        runId: input.runId,
        agentFile: ".hap/agents/trusted-care-agent.json",
        method: "POST",
        path: "/prior-auth",
        body: {
          patientId: "maya-001",
          requestedService: "Cardiology specialist follow-up",
          payer: "Demo Health Plan"
        },
        scenario: "trusted"
      });
      return;
    }

    await sendGatewayRequest({
      runId: input.runId,
      agentFile: ".hap/agents/sketchy-scraper-agent.json",
      method: "GET",
      path: "/fhir/all?dump=true",
      scenario: "attack"
    });
  } catch (error) {
    ingestLocalEvent({
      runId: input.runId,
      requestId: "studio-demo-runner",
      phase: "return_response",
      label: "Gateway request failed. Start `pnpm demo` or `pnpm gateway`.",
      status: "failed",
      details: {
        error: error instanceof Error ? error.message : "Unknown gateway error"
      }
    });
  }
}

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return Response.json({ error: "Invalid scenario." }, { status: 400 });
  }

  const runId = randomUUID();
  const expectedRequests = parsed.data.scenario === "trusted" ? 2 : 1;

  ingestLocalEvent({
    runId,
    requestId: "studio-demo-runner",
    phase: "receive_request",
    label:
      parsed.data.scenario === "trusted"
        ? "Studio launched TrustedCareAgent against the gateway"
        : "Studio launched SketchyScraperAgent against the gateway",
    status: "info",
    details: {
      expectedRequests,
      gateway: process.env.GATEWAY_URL ?? "http://localhost:8787"
    }
  });

  void startDemoRunAsync({
    runId,
    scenario: parsed.data.scenario
  });

  return Response.json({
    runId,
    expectedRequests
  });
}

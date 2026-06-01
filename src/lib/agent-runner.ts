import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import { signingBaseString, signText } from "./crypto";
import { handleGatewayRequest, type GatewayOutput } from "./gateway";
import { makeCareAdminSummary, type CareAdminSummary } from "./llm";
import { runAgentSandbox } from "./sandbox/sandbox-runner";
import type {
  SandboxReport,
  SandboxScenario
} from "./sandbox/sandbox-types";

async function signedGatewayCall(input: {
  agentId: string;
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  sandboxReport?: SandboxReport;
}): Promise<GatewayOutput> {
  const agent = await prisma.agentIdentity.findUnique({
    where: { id: input.agentId }
  });

  if (!agent?.privateKeyPem) {
    throw new Error(`Demo private key missing for ${input.agentId}`);
  }

  const timestamp = new Date().toISOString();
  const nonce = randomUUID();
  const body = input.body ?? {};
  const base = signingBaseString({
    method: input.method,
    path: input.path,
    body,
    timestamp,
    nonce
  });
  const signature = signText(agent.privateKeyPem, base);

  return handleGatewayRequest({
    method: input.method,
    path: input.path,
    body,
    sandboxReport: input.sandboxReport,
    headers: {
      "x-agent-id": input.agentId,
      "x-agent-timestamp": timestamp,
      "x-agent-nonce": nonce,
      "x-agent-signature": signature
    }
  });
}

export type AgentRunResult = {
  agentId: SandboxScenario;
  label: string;
  sandboxReport: SandboxReport;
  calls: GatewayOutput[];
  summary: CareAdminSummary;
};

export async function runTrustedCareAgent(): Promise<AgentRunResult> {
  const sandboxReport = await runAgentSandbox("trusted-care-agent");
  const patientCall = await signedGatewayCall({
    agentId: "trusted-care-agent",
    method: "GET",
    path: "/fhir/patient/maya-001",
    sandboxReport
  });

  const priorAuthCall = await signedGatewayCall({
    agentId: "trusted-care-agent",
    method: "POST",
    path: "/prior-auth",
    body: {
      patientId: "maya-001",
      requestedService: "Cardiology specialist follow-up",
      payer: "Demo Health Plan"
    },
    sandboxReport
  });

  const summary = await makeCareAdminSummary({
    patientCall,
    priorAuthCall
  });

  return {
    agentId: "trusted-care-agent",
    label: "TrustedCareAgent",
    sandboxReport,
    calls: [patientCall, priorAuthCall],
    summary
  };
}

export async function runSketchyScraperAgent(): Promise<AgentRunResult> {
  const sandboxReport = await runAgentSandbox("sketchy-scraper-agent");
  const bulkAttempt = await signedGatewayCall({
    agentId: "sketchy-scraper-agent",
    method: "GET",
    path: "/fhir/all?dump=true",
    sandboxReport
  });

  return {
    agentId: "sketchy-scraper-agent",
    label: "SketchyScraperAgent",
    sandboxReport,
    calls: [bulkAttempt],
    summary: {
      title: "Access blocked",
      safeAdminSummary:
        "SketchyScraperAgent attempted a bulk data path and triggered high-risk sandbox behavior. The gateway denied access before any protected synthetic health API data was returned.",
      missingDocuments: [],
      nextSteps: ["Review audit log", "Keep route as sandbox_only"],
      safetyFlags: [
        "bulk_access_attempt",
        "missing_patient_scope",
        "sandbox_block"
      ]
    }
  };
}

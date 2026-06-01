import type { SandboxDecision } from "./types.js";

export async function runBehavioralSandbox(input: {
  agentId: string;
  method: string;
  path: string;
  scenario?: string;
}): Promise<SandboxDecision> {
  const isAttack =
    input.scenario === "attack" ||
    input.agentId.includes("sketchy") ||
    input.path.startsWith("/fhir/all");

  if (isAttack) {
    return {
      mode: "mock",
      riskScore: 96,
      verdict: "block",
      signals: [
        "Runtime: deterministic mock sandbox",
        "Sandbox container started",
        "Network restricted",
        "Filesystem read-only",
        `Observed ${input.path}`,
        "Observed OPENAI_API_KEY secret probe",
        "Observed outbound exfiltration attempt",
        "Route impact sandbox_only"
      ],
      observedEvents: [
        { type: "http_request", target: input.path, risk: "critical" },
        { type: "secret_probe", target: "OPENAI_API_KEY", risk: "critical" },
        { type: "network", target: "unknown-exfil.example", risk: "high" }
      ]
    };
  }

  return {
    mode: "mock",
    riskScore: 4,
    verdict: "clean",
    signals: [
      "Runtime: deterministic mock sandbox",
      "Sandbox container started",
      "Network restricted",
      "Filesystem read-only",
      "Observed scoped FHIR request",
      "No secret access attempt",
      "No outbound exfiltration",
      "Risk score 4/100"
    ],
    observedEvents: [
      { type: "http_request", target: input.path, risk: "low" }
    ]
  };
}

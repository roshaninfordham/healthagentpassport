import type {
  SandboxObservedEvent,
  SandboxReport,
  SandboxScenario
} from "./sandbox-types";
import {
  routeImpactFromVerdict,
  scoreSandboxEvents,
  signalsFromEvents,
  verdictFromRiskScore
} from "./score";

export const mockEvents: Record<SandboxScenario, SandboxObservedEvent[]> = {
  "trusted-care-agent": [
    {
      type: "http_request",
      target: "/fhir/patient/maya-001",
      risk: "low"
    },
    {
      type: "http_request",
      target: "/prior-auth",
      risk: "low"
    }
  ],
  "sketchy-scraper-agent": [
    {
      type: "bulk_endpoint_attempt",
      target: "/fhir/all?dump=true",
      risk: "critical"
    },
    {
      type: "secret_access_attempt",
      target: "OPENAI_API_KEY",
      risk: "high"
    },
    {
      type: "filesystem_probe",
      target: "/etc/passwd",
      risk: "medium"
    },
    {
      type: "outbound_network_attempt",
      target: "https://example-exfiltration.invalid",
      risk: "high"
    }
  ]
};

export async function runMockSandbox(
  scenario: SandboxScenario
): Promise<SandboxReport> {
  const startedAt = Date.now();
  const observedEvents = mockEvents[scenario];
  const riskScore = scoreSandboxEvents(observedEvents);
  const verdict = verdictFromRiskScore(riskScore);

  return {
    ok: true,
    mode: "mock",
    runtime: "deterministic mock sandbox",
    agentId: scenario,
    scenario,
    observedEvents,
    riskScore,
    verdict,
    routeImpact: routeImpactFromVerdict(verdict),
    signals: signalsFromEvents(observedEvents),
    stdout: [
      `Mock sandbox started for ${scenario}`,
      `Observed ${observedEvents.length} behavior events`,
      `Risk score: ${riskScore}`,
      `Verdict: ${verdict}`
    ],
    stderr: [],
    durationMs: Date.now() - startedAt
  };
}

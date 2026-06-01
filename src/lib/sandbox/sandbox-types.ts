export type SandboxMode = "mock" | "gvisor" | "docker";

export type SandboxScenario = "trusted-care-agent" | "sketchy-scraper-agent";

export type SandboxRisk = "low" | "medium" | "high" | "critical";

export type SandboxObservedEvent = {
  type: string;
  target: string;
  risk: SandboxRisk;
};

export type SandboxReport = {
  id?: string;
  ok: boolean;
  mode: SandboxMode;
  runtime: string;
  agentId: string;
  scenario: string;
  observedEvents: SandboxObservedEvent[];
  riskScore: number;
  verdict: "clean" | "watch" | "suspicious" | "block";
  routeImpact:
    | "no_change"
    | "downgrade_to_sandbox"
    | "downgrade_to_sandbox_only";
  signals: string[];
  stdout: string[];
  stderr: string[];
  durationMs: number;
  error?: string;
};

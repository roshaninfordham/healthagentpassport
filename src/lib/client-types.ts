export type TrustProfileView = {
  agentId: string;
  trustScore: number;
  tier: string;
  route: "prod" | "prod_throttled" | "sandbox" | "sandbox_only";
  source: "mock" | "valiron";
  signals: {
    identityScore: number;
    onChainScore: number;
    behaviorScore: number;
    complianceScore: number;
    delegationScore: number;
    sandboxRiskScore?: number;
  };
  explanation: string[];
};

export type SandboxReportView = {
  id?: string;
  ok: boolean;
  mode: "mock" | "gvisor" | "docker";
  runtime: string;
  agentId: string;
  scenario: string;
  observedEvents: Array<{
    type: string;
    target: string;
    risk: "low" | "medium" | "high" | "critical";
  }>;
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

export type GatewayCallView = {
  requestId: string;
  allowed: boolean;
  httpStatus: number;
  decision: "allow" | "deny" | "sandbox" | "throttle";
  reason: string;
  data?: unknown;
  trust?: TrustProfileView;
  payment?: {
    mode: "mock" | "mpp" | "x402";
    status: "paid" | "free" | "challenge" | "skipped";
    costMicros: number;
    receiptId?: string;
  };
  audit?: unknown;
};

export type DemoResultView = {
  agentId: "trusted-care-agent" | "sketchy-scraper-agent";
  label: string;
  sandboxReport: SandboxReportView;
  calls: GatewayCallView[];
  summary: {
    title: string;
    safeAdminSummary: string;
    missingDocuments: string[];
    nextSteps: string[];
    safetyFlags: string[];
  };
};

export type AuditEventView = {
  id: string;
  requestId: string;
  agentId: string | null;
  patientId: string | null;
  method: string;
  path: string;
  decision: string;
  route: string;
  trustTier: string;
  trustScore: number;
  reason: string;
  requiredScopesJson: string;
  grantedScopesJson: string | null;
  httpStatus: number;
  latencyMs: number;
  costMicros: number;
  delegationHash: string | null;
  requestHash: string;
  responseHash: string | null;
  sandboxRunId: string | null;
  sandboxRiskScore: number | null;
  sandboxVerdict: string | null;
  createdAt: string;
};

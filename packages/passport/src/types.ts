export type RunEventStatus =
  | "queued"
  | "running"
  | "passed"
  | "failed"
  | "blocked"
  | "info";

export type RunEventPhase =
  | "receive_request"
  | "parse_policy"
  | "match_route_policy"
  | "verify_agent_identity"
  | "check_timestamp"
  | "check_nonce_replay"
  | "run_behavioral_sandbox"
  | "load_patient_delegation"
  | "check_required_scopes"
  | "compute_trust_score"
  | "create_payment_receipt"
  | "fetch_upstream_api"
  | "hash_response"
  | "write_audit_event"
  | "return_response";

export type RunEvent = {
  id: string;
  runId: string;
  requestId: string;
  ts: string;
  phase: RunEventPhase;
  label: string;
  status: RunEventStatus;
  durationMs?: number;
  details?: Record<string, unknown>;
};

export type TrustRoute =
  | "prod"
  | "prod_throttled"
  | "sandbox"
  | "sandbox_only";

export type AgentKeyFile = {
  id: string;
  name: string;
  publicKeyPem: string;
  privateKeyPem?: string;
  trust?: {
    identityScore?: number;
    onChainScore?: number;
    behaviorScore?: number;
    complianceScore?: number;
    defaultTier?: string;
  };
};

export type HealthAgentPolicy = {
  version: number;
  service: {
    name: string;
    upstream: string;
    description?: string;
  };
  demo?: {
    syntheticOnly?: boolean;
    noMedicalAdvice?: boolean;
    artificialStepDelayMs?: number;
  };
  agents: Record<
    string,
    {
      name: string;
      publicKeyFile: string;
      defaultTrustTier: string;
    }
  >;
  routes: PolicyRoute[];
  deny?: DenyRule[];
};

export type PolicyRoute = {
  id: string;
  description?: string;
  match: {
    method: string;
    path: string;
  };
  patientContext?: {
    source: "path" | "body";
    param?: string;
    field?: string;
  };
  requiredScopes: string[];
  trust: {
    minScore: number;
    allowedRoutes: TrustRoute[];
  };
  sandbox: {
    required: boolean;
    maxRiskScore: number;
  };
};

export type DenyRule = {
  id: string;
  match: {
    method: string;
    pathPrefix: string;
  };
  reason: string;
};

export type SandboxVerdict = "clean" | "watch" | "suspicious" | "block";

export type SandboxDecision = {
  mode: "mock" | "gvisor" | "docker";
  riskScore: number;
  verdict: SandboxVerdict;
  signals: string[];
  observedEvents: Array<{
    type: string;
    target: string;
    risk: "low" | "medium" | "high" | "critical";
  }>;
};

export type GatewayDecision = {
  runId: string;
  requestId: string;
  agentId: string;
  method: string;
  path: string;
  allowed: boolean;
  blockedBeforeUpstream: boolean;
  policy?: {
    routeId: string;
    requiredScopes: string[];
  };
  identity: {
    signatureValid: boolean;
    timestampFresh: boolean;
    nonceFresh: boolean;
  };
  sandbox: SandboxDecision;
  consent: {
    valid: boolean;
    patientId?: string;
    delegationHash?: string;
    grantedScopes: string[];
    missingScopes: string[];
  };
  trust: {
    score: number;
    tier: string;
    route: TrustRoute;
  };
  payment: {
    mode: "mock";
    receiptId: string;
    costMicros: number;
  };
  upstream?: {
    called: boolean;
    url?: string;
    status?: number;
    latencyMs?: number;
    body?: unknown;
  };
  audit: {
    requestHash: string;
    responseHash?: string;
    auditId: string;
  };
  reason: string;
};

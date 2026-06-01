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

export type GatewayDecisionEvent = {
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
  sandbox: {
    mode: "mock" | "gvisor" | "docker";
    riskScore: number;
    verdict: "clean" | "watch" | "suspicious" | "block";
    signals: string[];
  };
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
    route: "prod" | "prod_throttled" | "sandbox" | "sandbox_only";
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

export type RunState = {
  runId: string;
  events: RunEvent[];
  decisions: GatewayDecisionEvent[];
  startedAt: string;
  updatedAt: string;
};

type Listener = (event: RunEvent) => void;

type Store = {
  runs: Map<string, RunState>;
  latestRunId: string | null;
  listeners: Set<Listener>;
};

const globalForEvents = globalThis as typeof globalThis & {
  __healthAgentEventStore?: Store;
};

const store =
  globalForEvents.__healthAgentEventStore ??
  ({
    runs: new Map<string, RunState>(),
    latestRunId: null,
    listeners: new Set<Listener>()
  } satisfies Store);

globalForEvents.__healthAgentEventStore = store;

function extractDecision(event: RunEvent): GatewayDecisionEvent | null {
  const decision = event.details?.decision;

  if (!decision || typeof decision !== "object") {
    return null;
  }

  return decision as GatewayDecisionEvent;
}

export function ingestRunEvent(event: RunEvent) {
  const existing = store.runs.get(event.runId);
  const now = new Date().toISOString();
  const run: RunState =
    existing ??
    ({
      runId: event.runId,
      events: [],
      decisions: [],
      startedAt: event.ts,
      updatedAt: now
    } satisfies RunState);

  run.events.push(event);
  run.updatedAt = now;

  const decision = extractDecision(event);
  if (decision) {
    run.decisions = [
      ...run.decisions.filter((item) => item.requestId !== decision.requestId),
      decision
    ];
  }

  store.runs.set(event.runId, run);
  store.latestRunId = event.runId;

  for (const listener of store.listeners) {
    listener(event);
  }

  return run;
}

export function subscribeRunEvents(listener: Listener) {
  store.listeners.add(listener);

  return () => {
    store.listeners.delete(listener);
  };
}

export function getRun(runId: string) {
  return store.runs.get(runId) ?? null;
}

export function getLatestRun() {
  return store.latestRunId ? getRun(store.latestRunId) : null;
}

export function getRecentRuns() {
  return [...store.runs.values()]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 10);
}

export function clearRuns() {
  store.runs.clear();
  store.latestRunId = null;
}

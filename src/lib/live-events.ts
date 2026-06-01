import type {
  EvidenceResult,
  PayerRequirements,
  PriorAuthCase,
  PriorAuthRunEvent
} from "@priorauth/passport-core";

export type { PriorAuthRunEvent };

export type PriorAuthRunResult = {
  priorAuthCase?: PriorAuthCase;
  requirements?: PayerRequirements;
  evidence?: EvidenceResult;
  authPackage?: unknown;
  submission?: unknown;
  roi?: unknown;
  practiceRoi?: unknown;
  audit?: unknown;
  ehrStats?: unknown;
  payerStats?: unknown;
};

export type RunState = {
  runId: string;
  caseId: string;
  scenario: "complete" | "incomplete";
  events: PriorAuthRunEvent[];
  result: PriorAuthRunResult;
  startedAt: string;
  updatedAt: string;
};

type Listener = (event: PriorAuthRunEvent) => void;

type Store = {
  runs: Map<string, RunState>;
  latestRunId: string | null;
  listeners: Set<Listener>;
};

const globalForEvents = globalThis as typeof globalThis & {
  __priorAuthEventStore?: Store;
};

const store =
  globalForEvents.__priorAuthEventStore ??
  ({
    runs: new Map<string, RunState>(),
    latestRunId: null,
    listeners: new Set<Listener>()
  } satisfies Store);

globalForEvents.__priorAuthEventStore = store;

function extractResult(event: PriorAuthRunEvent): Partial<PriorAuthRunResult> {
  if (!event.details) return {};

  return {
    priorAuthCase: event.details.priorAuthCase as PriorAuthCase | undefined,
    requirements: event.details.requirements as PayerRequirements | undefined,
    evidence: event.details.evidence as EvidenceResult | undefined,
    authPackage: event.details.authPackage,
    submission: event.details.submission,
    roi: event.details.roi,
    practiceRoi: event.details.practiceRoi,
    audit: event.details.audit,
    ehrStats: event.details.ehrStats,
    payerStats: event.details.payerStats
  };
}

export function ingestRunEvent(event: PriorAuthRunEvent, scenario: "complete" | "incomplete" = "complete") {
  const existing = store.runs.get(event.runId);
  const now = new Date().toISOString();
  const run: RunState =
    existing ??
    ({
      runId: event.runId,
      caseId: event.caseId,
      scenario,
      events: [],
      result: {},
      startedAt: event.timestamp,
      updatedAt: now
    } satisfies RunState);

  run.events.push(event);
  run.updatedAt = now;
  run.result = {
    ...run.result,
    ...extractResult(event)
  };

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

import { readFileSync } from "node:fs";
import { parse } from "yaml";
import {
  seedPriorAuthCase,
  type PayerRequirements,
  type PriorAuthScenario
} from "@priorauth/passport-core";

type Hit = {
  ts: string;
  method: "GET" | "POST";
  path: string;
};

type EhrStats = {
  patientReads: number;
  conditionReads: number;
  medicationReads: number;
  observationReads: number;
  documentReads: number;
  lastRequests: Hit[];
};

type PayerStats = {
  requirementsLookups: number;
  submissions: number;
  statusChecks: number;
  lastRequests: Hit[];
};

type InternalDemoStore = {
  ehrStats: EhrStats;
  payerStats: PayerStats;
  nextPriorAuthNumber: number;
};

type PayerRulesConfig = {
  payers: Record<
    string,
    {
      name: string;
      serviceRules: Record<
        string,
        Omit<PayerRequirements, "serviceCode" | "payer">
      >;
    }
  >;
};

type Endpoint = {
  fetchUrl: string;
  displayUrl: string;
  internal: boolean;
};

const demoSafety = {
  syntheticOnly: true,
  noMedicalDecisions: true,
  noTreatmentDecisioning: true
};

const globalForInternalDemo = globalThis as typeof globalThis & {
  __priorAuthInternalDemoStore?: InternalDemoStore;
};

const store =
  globalForInternalDemo.__priorAuthInternalDemoStore ??
  ({
    ehrStats: emptyEhrStats(),
    payerStats: emptyPayerStats(),
    nextPriorAuthNumber: 1001
  } satisfies InternalDemoStore);

globalForInternalDemo.__priorAuthInternalDemoStore = store;

export class DemoApiError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "demo_api_error"
  ) {
    super(message);
  }
}

function emptyEhrStats(): EhrStats {
  return {
    patientReads: 0,
    conditionReads: 0,
    medicationReads: 0,
    observationReads: 0,
    documentReads: 0,
    lastRequests: []
  };
}

function emptyPayerStats(): PayerStats {
  return {
    requirementsLookups: 0,
    submissions: 0,
    statusChecks: 0,
    lastRequests: []
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function record(stats: { lastRequests: Hit[] }, method: Hit["method"], path: string) {
  stats.lastRequests.unshift({
    ts: new Date().toISOString(),
    method,
    path
  });
  stats.lastRequests = stats.lastRequests.slice(0, 8);
}

function bundle(resourceType: string, entry: unknown[]) {
  return {
    resourceType: "Bundle",
    type: "searchset",
    total: entry.length,
    entry: entry.map((resource) => ({ resource }))
  };
}

function assertDemoPatient(patientId: string | null) {
  if (patientId && patientId !== seedPriorAuthCase.patient.id) {
    throw new DemoApiError(
      `Unknown synthetic patient ${patientId}.`,
      404,
      "unknown_patient"
    );
  }
}

function getScenario(searchParams: URLSearchParams): PriorAuthScenario {
  return searchParams.get("scenario") === "incomplete"
    ? "incomplete"
    : "complete";
}

function getPatientQuery(searchParams: URLSearchParams) {
  return searchParams.get("patient") ?? searchParams.get("patientId");
}

function loadPayerRules(path = "config/payer-rules.yaml") {
  return parse(readFileSync(path, "utf8")) as PayerRulesConfig;
}

function currentOrigin(fallbackOrigin?: string) {
  if (fallbackOrigin) return fallbackOrigin.replace(/\/$/, "");
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

function internalEndpoint(path: string, origin?: string): Endpoint {
  return {
    fetchUrl: new URL(path, currentOrigin(origin)).toString(),
    displayUrl: path,
    internal: true
  };
}

function externalEndpoint(baseUrl: string, path: string): Endpoint {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const fetchUrl = `${normalizedBaseUrl}${path}`;

  return {
    fetchUrl,
    displayUrl: fetchUrl,
    internal: false
  };
}

function query(path: string, params: Record<string, string>) {
  return `${path}?${new URLSearchParams(params).toString()}`;
}

export function demoJson(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-demo-synthetic-only", "true");
  headers.set("x-demo-no-medical-decisions", "true");

  return Response.json(data, {
    ...init,
    headers
  });
}

export function demoError(error: unknown) {
  if (error instanceof DemoApiError) {
    return demoJson(
      {
        error: error.message,
        code: error.code,
        ...demoSafety
      },
      { status: error.status }
    );
  }

  return demoJson(
    {
      error: error instanceof Error ? error.message : "Internal demo error.",
      code: "internal_demo_error",
      ...demoSafety
    },
    { status: 500 }
  );
}

export function getDemoWorkflowUrls(origin?: string) {
  const ehrBaseUrl = process.env.EHR_API_URL;
  const payerBaseUrl = process.env.PAYER_API_URL;

  return {
    ehr: {
      internal: !ehrBaseUrl,
      baseDisplayUrl: ehrBaseUrl ?? "/api/demo/ehr",
      health: () =>
        ehrBaseUrl
          ? externalEndpoint(ehrBaseUrl, "/health")
          : internalEndpoint("/api/health", origin),
      stats: () =>
        ehrBaseUrl
          ? externalEndpoint(ehrBaseUrl, "/stats")
          : internalEndpoint("/api/upstream/stats", origin),
      resetStats: () =>
        ehrBaseUrl
          ? externalEndpoint(ehrBaseUrl, "/stats/reset")
          : internalEndpoint("/api/upstream/stats", origin),
      patient: (patientId: string) =>
        ehrBaseUrl
          ? externalEndpoint(ehrBaseUrl, `/fhir/Patient/${patientId}`)
          : internalEndpoint(
              `/api/demo/ehr/patient/${encodeURIComponent(patientId)}`,
              origin
            ),
      conditions: (patientId: string) =>
        ehrBaseUrl
          ? externalEndpoint(ehrBaseUrl, `/fhir/Condition?patient=${patientId}`)
          : internalEndpoint(
              query("/api/demo/ehr/conditions", { patient: patientId }),
              origin
            ),
      medications: (patientId: string) =>
        ehrBaseUrl
          ? externalEndpoint(
              ehrBaseUrl,
              `/fhir/MedicationRequest?patient=${patientId}`
            )
          : internalEndpoint(
              query("/api/demo/ehr/medications", { patient: patientId }),
              origin
            ),
      observations: (patientId: string, scenario: PriorAuthScenario) =>
        ehrBaseUrl
          ? externalEndpoint(
              ehrBaseUrl,
              `/fhir/Observation?patient=${patientId}&scenario=${scenario}`
            )
          : internalEndpoint(
              query("/api/demo/ehr/observations", {
                patient: patientId,
                scenario
              }),
              origin
            ),
      documents: (patientId: string, scenario: PriorAuthScenario) =>
        ehrBaseUrl
          ? externalEndpoint(
              ehrBaseUrl,
              `/documents?patient=${patientId}&scenario=${scenario}`
            )
          : internalEndpoint(
              query("/api/demo/ehr/documents", {
                patient: patientId,
                scenario
              }),
              origin
            )
    },
    payer: {
      internal: !payerBaseUrl,
      baseDisplayUrl: payerBaseUrl ?? "/api/demo/payer",
      health: () =>
        payerBaseUrl
          ? externalEndpoint(payerBaseUrl, "/health")
          : internalEndpoint("/api/health", origin),
      stats: () =>
        payerBaseUrl
          ? externalEndpoint(payerBaseUrl, "/stats")
          : internalEndpoint("/api/upstream/stats", origin),
      resetStats: () =>
        payerBaseUrl
          ? externalEndpoint(payerBaseUrl, "/stats/reset")
          : internalEndpoint("/api/upstream/stats", origin),
      requirements: () =>
        payerBaseUrl
          ? externalEndpoint(payerBaseUrl, "/prior-auth/requirements")
          : internalEndpoint("/api/demo/payer/requirements", origin),
      submit: () =>
        payerBaseUrl
          ? externalEndpoint(payerBaseUrl, "/prior-auth/submit")
          : internalEndpoint("/api/demo/payer/submit", origin)
    },
    studio: {
      baseDisplayUrl: "/",
      sseStream: "/api/events/stream",
      ndjsonStream: "/api/demo/stream"
    }
  };
}

export function getSyntheticPatient(patientId: string) {
  assertDemoPatient(patientId);
  store.ehrStats.patientReads += 1;
  record(store.ehrStats, "GET", `/api/demo/ehr/patient/${patientId}`);

  return {
    resourceType: "Patient",
    id: seedPriorAuthCase.patient.id,
    name: [{ given: ["Maya"], family: "Patel" }],
    gender: "female",
    birthDate: seedPriorAuthCase.patient.dob,
    identifier: [
      {
        system: "demo-member-id",
        value: seedPriorAuthCase.patient.memberId
      }
    ]
  };
}

export function getSyntheticConditions(searchParams: URLSearchParams) {
  const patientId = getPatientQuery(searchParams);
  assertDemoPatient(patientId);
  store.ehrStats.conditionReads += 1;
  record(
    store.ehrStats,
    "GET",
    `/api/demo/ehr/conditions?patient=${patientId ?? seedPriorAuthCase.patient.id}`
  );

  return bundle(
    "Condition",
    seedPriorAuthCase.diagnoses.map((diagnosis, index) => ({
      resourceType: "Condition",
      id: `cond-${String(index + 1).padStart(3, "0")}`,
      subject: { reference: `Patient/${seedPriorAuthCase.patient.id}` },
      code: {
        coding: [
          {
            system: diagnosis.codeSystem,
            code: diagnosis.code
          }
        ],
        text: diagnosis.display
      }
    }))
  );
}

export function getSyntheticMedications(searchParams: URLSearchParams) {
  const patientId = getPatientQuery(searchParams);
  assertDemoPatient(patientId);
  store.ehrStats.medicationReads += 1;
  record(
    store.ehrStats,
    "GET",
    `/api/demo/ehr/medications?patient=${patientId ?? seedPriorAuthCase.patient.id}`
  );

  return bundle("MedicationRequest", [
    {
      resourceType: "MedicationRequest",
      id: "med-001",
      subject: { reference: `Patient/${seedPriorAuthCase.patient.id}` },
      medicationCodeableConcept: { text: "Metformin 500mg" },
      status: "active",
      intent: "order"
    }
  ]);
}

export function getSyntheticObservations(searchParams: URLSearchParams) {
  const patientId = getPatientQuery(searchParams);
  const scenario = getScenario(searchParams);
  assertDemoPatient(patientId);
  store.ehrStats.observationReads += 1;
  record(
    store.ehrStats,
    "GET",
    `/api/demo/ehr/observations?patient=${patientId ?? seedPriorAuthCase.patient.id}&scenario=${scenario}`
  );

  return bundle(
    "Observation",
    scenario === "incomplete"
      ? []
      : [
          {
            resourceType: "Observation",
            id: "obs-bp-001",
            subject: { reference: `Patient/${seedPriorAuthCase.patient.id}` },
            code: { text: "Blood pressure" },
            valueString: "142/88",
            effectiveDateTime: "2026-05-20"
          }
        ]
  );
}

export function getSyntheticDocuments(searchParams: URLSearchParams) {
  const patientId = getPatientQuery(searchParams);
  const scenario = getScenario(searchParams);
  assertDemoPatient(patientId);
  store.ehrStats.documentReads += 1;
  record(
    store.ehrStats,
    "GET",
    `/api/demo/ehr/documents?patient=${patientId ?? seedPriorAuthCase.patient.id}&scenario=${scenario}`
  );

  const documents = [
    {
      id: "doc-referral-001",
      type: "referral_note",
      title: "Cardiology referral note",
      status: "available"
    },
    {
      id: "doc-echo-history-001",
      type: "prior_test_result",
      title: "Prior ECG result",
      status: "available"
    },
    {
      id: "doc-med-list-001",
      type: "medication_list",
      title: "Active medication list",
      status: "available"
    }
  ];

  return {
    patientId: seedPriorAuthCase.patient.id,
    documents:
      scenario === "incomplete"
        ? documents.filter((document) => document.type !== "referral_note")
        : documents,
    ...demoSafety
  };
}

export function getSyntheticPayerRequirements(input: {
  payerId?: string;
  serviceCode?: string;
}) {
  store.payerStats.requirementsLookups += 1;
  record(store.payerStats, "POST", "/api/demo/payer/requirements");

  const payerId = input.payerId ?? seedPriorAuthCase.payer.id;
  const serviceCode = input.serviceCode ?? seedPriorAuthCase.requestedService.code;
  const rules = loadPayerRules();
  const payer = rules.payers[payerId];
  const rule = payer?.serviceRules[serviceCode];

  if (!payer || !rule) {
    throw new DemoApiError(
      `No synthetic payer rule for ${payerId}/${serviceCode}.`,
      404,
      "unknown_payer_rule"
    );
  }

  return {
    ...rule,
    serviceCode,
    payer: payer.name,
    ...demoSafety
  } satisfies PayerRequirements & typeof demoSafety;
}

export function submitSyntheticPriorAuthPackage(body: {
  caseId?: string;
  evidence?: unknown[];
}) {
  store.payerStats.submissions += 1;
  record(store.payerStats, "POST", "/api/demo/payer/submit");

  const priorAuthId = `PA-DEMO-${store.nextPriorAuthNumber++}`;

  return {
    priorAuthId,
    status: "submitted",
    decision: "pending_payer_review",
    receivedAt: new Date().toISOString(),
    message: "Synthetic electronic prior authorization package received.",
    caseId: body.caseId,
    evidenceCount: Array.isArray(body.evidence) ? body.evidence.length : 0,
    ...demoSafety
  };
}

export function getInternalDemoStats() {
  return {
    ehr: clone(store.ehrStats),
    payer: clone(store.payerStats)
  };
}

export function resetInternalDemoStats() {
  store.ehrStats = emptyEhrStats();
  store.payerStats = emptyPayerStats();
  store.nextPriorAuthNumber = 1001;

  return getInternalDemoStats();
}

export function getDemoSafety() {
  return demoSafety;
}

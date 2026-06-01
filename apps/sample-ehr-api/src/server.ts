import Fastify from "fastify";
import {
  bundle,
  conditions,
  documents,
  medications,
  observations,
  patient
} from "./synthetic-data.js";

const port = Number(process.env.PORT ?? 4001);
const app = Fastify({ logger: false });

type Hit = {
  ts: string;
  method: string;
  path: string;
};

const stats = {
  patientReads: 0,
  conditionReads: 0,
  medicationReads: 0,
  observationReads: 0,
  documentReads: 0,
  lastRequests: [] as Hit[]
};

function record(method: string, path: string) {
  stats.lastRequests.unshift({
    ts: new Date().toISOString(),
    method,
    path
  });
  stats.lastRequests = stats.lastRequests.slice(0, 8);
}

app.get("/health", async () => ({
  ok: true,
  service: "sample-ehr-api",
  syntheticOnly: true
}));

app.get("/stats", async () => stats);

app.post("/stats/reset", async () => {
  stats.patientReads = 0;
  stats.conditionReads = 0;
  stats.medicationReads = 0;
  stats.observationReads = 0;
  stats.documentReads = 0;
  stats.lastRequests = [];
  return stats;
});

app.get<{ Params: { id: string } }>("/fhir/Patient/:id", async (request) => {
  stats.patientReads += 1;
  record("GET", `/fhir/Patient/${request.params.id}`);
  return patient;
});

app.get("/fhir/Condition", async () => {
  stats.conditionReads += 1;
  record("GET", "/fhir/Condition?patient=maya-001");
  return bundle("Condition", conditions);
});

app.get("/fhir/MedicationRequest", async () => {
  stats.medicationReads += 1;
  record("GET", "/fhir/MedicationRequest?patient=maya-001");
  return bundle("MedicationRequest", medications);
});

app.get<{ Querystring: { scenario?: string } }>(
  "/fhir/Observation",
  async (request) => {
    stats.observationReads += 1;
    record("GET", "/fhir/Observation?patient=maya-001");
    const resources =
      request.query.scenario === "incomplete" ? [] : observations;
    return bundle("Observation", resources);
  }
);

app.get<{ Querystring: { scenario?: string } }>("/documents", async (request) => {
  stats.documentReads += 1;
  record("GET", "/documents?patient=maya-001");
  const availableDocuments =
    request.query.scenario === "incomplete"
      ? documents.filter((document) => document.type !== "referral_note")
      : documents;

  return {
    patientId: "maya-001",
    documents: availableDocuments
  };
});

app
  .listen({ port, host: "0.0.0.0" })
  .then((address) => {
    console.log(`Sample EHR API listening on ${address}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import Fastify from "fastify";

const port = Number(process.env.PORT ?? 4001);
const app = Fastify({ logger: false });

type Hit = {
  ts: string;
  method: string;
  path: string;
};

const stats = {
  totalHits: 0,
  patientReadHits: 0,
  priorAuthHits: 0,
  bulkDumpHits: 0,
  lastHits: [] as Hit[]
};

function recordHit(method: string, path: string) {
  stats.totalHits += 1;
  stats.lastHits.unshift({
    ts: new Date().toISOString(),
    method,
    path
  });
  stats.lastHits = stats.lastHits.slice(0, 8);
}

app.get("/health", async () => ({
  ok: true,
  service: "sample-health-api",
  syntheticOnly: true
}));

app.get("/stats", async () => stats);

app.post("/stats/reset", async () => {
  stats.totalHits = 0;
  stats.patientReadHits = 0;
  stats.priorAuthHits = 0;
  stats.bulkDumpHits = 0;
  stats.lastHits = [];

  return stats;
});

app.get<{ Params: { patientId: string } }>(
  "/fhir/patient/:patientId",
  async (request) => {
    recordHit("GET", `/fhir/patient/${request.params.patientId}`);
    stats.patientReadHits += 1;

    return {
      syntheticOnly: true,
      resourceType: "Bundle",
      type: "collection",
      patientId: request.params.patientId,
      entry: [
        {
          resource: {
            resourceType: "Patient",
            id: "maya-001",
            name: [{ given: ["Maya"], family: "Patel" }],
            gender: "female",
            birthDate: "1978-04-12"
          }
        },
        {
          resource: {
            resourceType: "Condition",
            id: "cond-001",
            code: { text: "Type 2 diabetes mellitus" }
          }
        },
        {
          resource: {
            resourceType: "Observation",
            id: "obs-a1c-001",
            code: { text: "Hemoglobin A1c" },
            valueQuantity: { value: 7.6, unit: "%" }
          }
        }
      ]
    };
  }
);

app.post("/prior-auth", async (request) => {
  recordHit("POST", "/prior-auth");
  stats.priorAuthHits += 1;

  const body = request.body as {
    patientId?: string;
    requestedService?: string;
    payer?: string;
  };

  return {
    syntheticOnly: true,
    priorAuthId: `pa-demo-${Date.now().toString(36)}`,
    status: "submitted",
    patientId: body?.patientId ?? "maya-001",
    requestedService: body?.requestedService ?? "Cardiology specialist follow-up",
    payer: body?.payer ?? "Demo Health Plan"
  };
});

app.get("/fhir/all", async () => {
  recordHit("GET", "/fhir/all");
  stats.bulkDumpHits += 1;

  return {
    warning: "This route should never be reached by SketchyScraperAgent.",
    records: []
  };
});

app
  .listen({ port, host: "0.0.0.0" })
  .then((address) => {
    console.log(`Sample health API listening on ${address}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

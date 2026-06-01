import Fastify from "fastify";
import { requirements } from "./payer-rules.js";

const port = Number(process.env.PORT ?? 4002);
const app = Fastify({ logger: false });
let nextPriorAuthNumber = 1001;

type Hit = {
  ts: string;
  method: string;
  path: string;
};

const stats = {
  requirementsLookups: 0,
  submissions: 0,
  statusChecks: 0,
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
  service: "sample-payer-api",
  syntheticOnly: true
}));

app.get("/stats", async () => stats);

app.post("/stats/reset", async () => {
  stats.requirementsLookups = 0;
  stats.submissions = 0;
  stats.statusChecks = 0;
  stats.lastRequests = [];
  nextPriorAuthNumber = 1001;
  return stats;
});

app.post("/prior-auth/requirements", async () => {
  stats.requirementsLookups += 1;
  record("POST", "/prior-auth/requirements");
  return requirements;
});

app.post("/prior-auth/submit", async (request) => {
  stats.submissions += 1;
  record("POST", "/prior-auth/submit");
  const body = request.body as {
    caseId?: string;
    evidence?: string[];
  };
  const priorAuthId = `PA-DEMO-${nextPriorAuthNumber++}`;

  return {
    priorAuthId,
    status: "submitted",
    decision: "pending_payer_review",
    receivedAt: new Date().toISOString(),
    message: "Synthetic electronic prior authorization package received.",
    caseId: body?.caseId,
    evidenceCount: body?.evidence?.length ?? 0
  };
});

app.get<{ Params: { id: string } }>("/prior-auth/:id/status", async (request) => {
  stats.statusChecks += 1;
  record("GET", `/prior-auth/${request.params.id}/status`);
  return {
    priorAuthId: request.params.id,
    status: "pending_payer_review",
    syntheticOnly: true
  };
});

app
  .listen({ port, host: "0.0.0.0" })
  .then((address) => {
    console.log(`Sample payer API listening on ${address}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

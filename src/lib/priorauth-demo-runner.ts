import { randomUUID } from "node:crypto";
import {
  buildPriorAuthPackage,
  calculatePerAuthRoi,
  calculatePracticeRoi,
  createAuditEvent,
  getSeedCase,
  loadRoiConfig,
  matchEvidence,
  type PriorAuthRunEvent,
  type PriorAuthScenario
} from "@priorauth/passport-core";
import { ingestRunEvent } from "@/lib/live-events";

type RunContext = {
  runId: string;
  caseId: string;
  scenario: PriorAuthScenario;
  demoDelayMs: number;
};

const requiredScopes = [
  "patient/Patient.read",
  "patient/Condition.read",
  "patient/MedicationRequest.read",
  "patient/Observation.read",
  "payer/PriorAuth.write"
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeForUi(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return { value };
  return value as Record<string, unknown>;
}

async function emit(
  ctx: RunContext,
  event: Omit<PriorAuthRunEvent, "id" | "runId" | "caseId" | "timestamp">
) {
  ingestRunEvent(
    {
      ...event,
      id: randomUUID(),
      runId: ctx.runId,
      caseId: ctx.caseId,
      timestamp: new Date().toISOString()
    },
    ctx.scenario
  );
}

async function runStep<T>(
  ctx: RunContext,
  phase: PriorAuthRunEvent["phase"],
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const started = Date.now();

  await emit(ctx, { phase, label, status: "running" });
  await sleep(ctx.demoDelayMs);

  try {
    const result = await fn();

    await emit(ctx, {
      phase,
      label,
      status: "passed",
      durationMs: Date.now() - started,
      details: summarizeForUi(result)
    });

    return result;
  } catch (error) {
    await emit(ctx, {
      phase,
      label,
      status: "failed",
      durationMs: Date.now() - started,
      details: {
        error: error instanceof Error ? error.message : "Unknown error"
      }
    });

    throw error;
  }
}

async function fetchJson(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
}

export async function runElectronicPriorAuthDemo(input: {
  runId: string;
  caseId: string;
  scenario: PriorAuthScenario;
}) {
  const ehrBaseUrl = process.env.EHR_API_URL ?? "http://localhost:4001";
  const payerBaseUrl = process.env.PAYER_API_URL ?? "http://localhost:4002";
  const ctx: RunContext = {
    runId: input.runId,
    caseId: input.caseId,
    scenario: input.scenario,
    demoDelayMs: Number(process.env.DEMO_STEP_DELAY_MS ?? 750)
  };

  await emit(ctx, {
    phase: "start",
    label:
      input.scenario === "complete"
        ? "Run complete electronic prior-auth case"
        : "Run incomplete documentation case",
    status: "info"
  });

  const priorAuthCase = await runStep(
    ctx,
    "load_case",
    "Load synthetic prior-auth case",
    async () => ({ priorAuthCase: getSeedCase(input.caseId) })
  ).then((result) => result.priorAuthCase);

  await runStep(
    ctx,
    "verify_agent",
    "Verify TrustedPriorAuthAgent identity and administrative scopes",
    async () => ({
      agentId: "trusted-priorauth-agent",
      signatureValid: true,
      delegationValid: true,
      scopes: requiredScopes
    })
  );

  const patient = await runStep(
    ctx,
    "fetch_patient",
    "Fetch patient demographics from synthetic EHR",
    async () => fetchJson(`${ehrBaseUrl}/fhir/Patient/${priorAuthCase.patient.id}`)
  );

  const conditions = await runStep(
    ctx,
    "fetch_conditions",
    "Fetch diagnosis list",
    async () =>
      fetchJson(`${ehrBaseUrl}/fhir/Condition?patient=${priorAuthCase.patient.id}`)
  );

  const medications = await runStep(
    ctx,
    "fetch_medications",
    "Fetch active medication list",
    async () =>
      fetchJson(
        `${ehrBaseUrl}/fhir/MedicationRequest?patient=${priorAuthCase.patient.id}`
      )
  );

  const observations = await runStep(
    ctx,
    "fetch_observations",
    "Fetch recent clinical observations",
    async () =>
      fetchJson(
        `${ehrBaseUrl}/fhir/Observation?patient=${priorAuthCase.patient.id}&scenario=${input.scenario}`
      )
  );

  const documents = await runStep(
    ctx,
    "fetch_documents",
    "Fetch available supporting documents",
    async () =>
      fetchJson(
        `${ehrBaseUrl}/documents?patient=${priorAuthCase.patient.id}&scenario=${input.scenario}`
      )
  );

  const requirements = await runStep(
    ctx,
    "discover_payer_requirements",
    "Discover payer documentation requirements",
    async () => ({
      requirements: await postJson(`${payerBaseUrl}/prior-auth/requirements`, {
        payerId: priorAuthCase.payer.id,
        memberId: priorAuthCase.patient.memberId,
        serviceCode: priorAuthCase.requestedService.code,
        diagnosisCodes: priorAuthCase.diagnoses.map((diagnosis) => diagnosis.code)
      })
    })
  ).then((result) => result.requirements);

  const evidence = await runStep(
    ctx,
    "match_evidence",
    "Match EHR evidence to payer requirements",
    async () => ({
      evidence: matchEvidence({
        requirements,
        conditions,
        medications,
        observations,
        documents
      })
    })
  ).then((result) => result.evidence);

  if (!evidence.complete) {
    const roiConfig = loadRoiConfig();
    const roi = calculatePerAuthRoi(roiConfig.input);
    const practiceRoi = calculatePracticeRoi(roiConfig.input);
    const audit = createAuditEvent({
      runId: ctx.runId,
      caseId: ctx.caseId,
      evidence,
      roi,
      status: "draft_missing_evidence"
    });

    await emit(ctx, {
      phase: "blocked",
      label: "Missing evidence detected. Draft saved; payer submission not sent.",
      status: "blocked",
      details: {
        evidence,
        roi,
        practiceRoi,
        audit,
        submission: {
          status: "not_submitted",
          reason: "Missing required evidence"
        }
      }
    });

    return;
  }

  const authPackage = await runStep(
    ctx,
    "build_package",
    "Build electronic prior-auth package",
    async () => ({
      authPackage: buildPriorAuthPackage({
        priorAuthCase,
        evidence
      })
    })
  ).then((result) => result.authPackage);

  const submission = await runStep(
    ctx,
    "submit_prior_auth",
    "Submit electronic prior authorization to payer API",
    async () => ({
      submission: await postJson(`${payerBaseUrl}/prior-auth/submit`, authPackage)
    })
  ).then((result) => result.submission);

  const roiConfig = loadRoiConfig();
  const roi = await runStep(
    ctx,
    "calculate_roi",
    "Calculate cost and time savings",
    async () => ({
      roi: calculatePerAuthRoi(roiConfig.input),
      practiceRoi: calculatePracticeRoi(roiConfig.input),
      roiSource: roiConfig.sourceLabel
    })
  );

  const audit = await runStep(
    ctx,
    "write_audit",
    "Write audit evidence",
    async () => ({
      audit: createAuditEvent({
        runId: ctx.runId,
        caseId: ctx.caseId,
        priorAuthId: (submission as { priorAuthId?: string }).priorAuthId,
        roi: roi.roi,
        evidence,
        status: "submitted"
      })
    })
  ).then((result) => result.audit);

  const [ehrStats, payerStats] = await Promise.all([
    fetchJson(`${ehrBaseUrl}/stats`).catch(() => null),
    fetchJson(`${payerBaseUrl}/stats`).catch(() => null)
  ]);

  await emit(ctx, {
    phase: "complete",
    label: "Electronic prior authorization workflow complete",
    status: "passed",
    details: {
      priorAuthCase,
      requirements,
      evidence,
      authPackage,
      submission,
      roi: roi.roi,
      practiceRoi: roi.practiceRoi,
      audit,
      ehrStats,
      payerStats
    }
  });
}

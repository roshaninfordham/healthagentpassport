import { randomUUID } from "node:crypto";
import {
  buildPriorAuthPackage,
  calculatePerAuthRoi,
  calculatePracticeRoi,
  createAuditEvent,
  getSeedCase,
  loadRoiConfig,
  matchEvidence,
  sha256Hex,
  type ApiExchange,
  type PayerRequirements,
  type PriorAuthRunEvent,
  type PriorAuthScenario,
  type ToolCallRecord
} from "@priorauth/passport-core";
import { getDemoStepDelayMs } from "@/lib/demo-config";

type Emit = (event: PriorAuthRunEvent) => Promise<void> | void;

type ProofRow = {
  id: string;
  method: "GET" | "POST";
  path: string;
  status: number | "skipped";
  latencyMs: number;
  hash?: string;
  source: "ehr" | "payer" | "core";
};

type AuditPacket = {
  title: "PriorAuth Passport Audit Packet";
  status: "Submitted" | "Needs human review";
  caseSummary: Record<string, unknown>;
  workflowSummary: Array<Record<string, unknown>>;
  dataSources: Array<Record<string, unknown>>;
  payerRequirements?: unknown;
  evidenceResult?: unknown;
  submissionResult?: unknown;
  roi?: unknown;
  safety: string[];
  auditHashes?: unknown;
  markdown: string;
};

type Context = {
  runId: string;
  caseId: string;
  scenario: PriorAuthScenario;
  origin: string;
  emit: Emit;
  delayMs: number;
  proofRows: ProofRow[];
  workflowSummary: Array<Record<string, unknown>>;
};

const routeMap = {
  patient: "/api/demo/ehr/patient/maya-001",
  conditions: "/api/demo/ehr/conditions?patientId=maya-001",
  medications: "/api/demo/ehr/medications?patientId=maya-001",
  observations: (scenario: PriorAuthScenario) =>
    `/api/demo/ehr/observations?patientId=maya-001&scenario=${scenario}`,
  documents: (scenario: PriorAuthScenario) =>
    `/api/demo/ehr/documents?patientId=maya-001&scenario=${scenario}`,
  requirements: "/api/demo/payer/requirements",
  submit: "/api/demo/payer/submit"
};

const agentPolicy = [
  "Synthetic data only",
  "No medical advice",
  "No treatment recommendation",
  "No approval or denial of care",
  "Submit only if required evidence is complete"
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function event(
  ctx: Context,
  phase: PriorAuthRunEvent["phase"],
  label: string,
  status: PriorAuthRunEvent["status"],
  details?: Record<string, unknown>,
  durationMs?: number
): PriorAuthRunEvent {
  return {
    id: randomUUID(),
    runId: ctx.runId,
    caseId: ctx.caseId,
    timestamp: new Date().toISOString(),
    phase,
    label,
    status,
    durationMs,
    details: {
      proofRows: ctx.proofRows,
      workflowSummary: ctx.workflowSummary,
      ...details
    }
  };
}

function toolCall(
  id: string,
  name: string,
  status: ToolCallRecord["status"],
  input: Record<string, unknown>,
  output?: Record<string, unknown>
): ToolCallRecord {
  return { id, name, status, input, output };
}

function apiExchange(input: {
  id: string;
  label: string;
  source: ApiExchange["source"];
  method: ApiExchange["method"];
  path: string;
  status: ApiExchange["status"];
  requestBody?: unknown;
  responseBody?: unknown;
  summary?: string;
}): ApiExchange {
  return {
    id: input.id,
    label: input.label,
    source: input.source,
    method: input.method,
    url: input.path,
    status: input.status,
    requestBody: input.requestBody,
    responseBody: input.responseBody,
    summary:
      input.summary ?? `Calling ${input.method} ${input.path}`
  };
}

async function callInternalApi<T>(
  ctx: Context,
  input: {
    id: string;
    method: "GET" | "POST";
    path: string;
    source: ProofRow["source"];
    body?: unknown;
  }
): Promise<{ data: T; proof: ProofRow }> {
  const started = Date.now();
  const response = await fetch(`${ctx.origin}${input.path}`, {
    method: input.method,
    headers:
      input.method === "POST" ? { "content-type": "application/json" } : {},
    body: input.method === "POST" ? JSON.stringify(input.body ?? {}) : undefined,
    cache: "no-store"
  });
  const data = (await response.json()) as T;
  const proof: ProofRow = {
    id: input.id,
    method: input.method,
    path: input.path,
    status: response.status,
    latencyMs: Date.now() - started,
    hash: sha256Hex(data).slice(0, 10),
    source: input.source
  };

  ctx.proofRows.push(proof);
  return { data, proof };
}

async function runStep<T>(
  ctx: Context,
  input: {
    phase: PriorAuthRunEvent["phase"];
    agent: string;
    label: string;
    toolName: string;
    toolInput: Record<string, unknown>;
    api?: {
      label: string;
      source: ApiExchange["source"];
      method: ApiExchange["method"];
      path: string;
      requestBody?: unknown;
    };
    run: () => Promise<T>;
    summarize: (result: T) => string;
    output: (result: T) => Record<string, unknown>;
    resultDetails?: (result: T) => Record<string, unknown>;
  }
) {
  const started = Date.now();
  const stepId = input.phase;
  const runningApi = input.api
    ? apiExchange({
        id: stepId,
        label: input.api.label,
        source: input.api.source,
        method: input.api.method,
        path: input.api.path,
        requestBody: input.api.requestBody,
        status: "running"
      })
    : undefined;

  await ctx.emit(
    event(ctx, input.phase, input.label, "running", {
      agent: input.agent,
      inputSummary: JSON.stringify(input.toolInput),
      toolCall: toolCall(stepId, input.toolName, "running", input.toolInput),
      apiExchange: runningApi,
      summary:
        runningApi?.summary ??
        `${input.agent} called ${input.toolName}()`
    })
  );
  await sleep(ctx.delayMs);

  const result = await input.run();
  const output = input.output(result);
  const summary = input.summarize(result);
  const durationMs = Date.now() - started;

  ctx.workflowSummary.push({
    agent: input.agent,
    action: input.label,
    tool: input.toolName,
    status: "passed",
    input: input.toolInput,
    output,
    durationMs
  });

  await ctx.emit(
    event(ctx, input.phase, input.label, "passed", {
      agent: input.agent,
      inputSummary: JSON.stringify(input.toolInput),
      outputSummary: summary,
      toolCall: toolCall(stepId, input.toolName, "passed", input.toolInput, output),
      apiExchange: input.api
        ? apiExchange({
            id: stepId,
            label: input.api.label,
            source: input.api.source,
            method: input.api.method,
            path: input.api.path,
            requestBody: input.api.requestBody,
            status: "passed",
            responseBody: result,
            summary
          })
        : undefined,
      summary,
      ...(input.resultDetails?.(result) ?? {})
    }, durationMs)
  );

  return result;
}

function auditPacketMarkdown(packet: Omit<AuditPacket, "markdown">) {
  const submission = packet.submissionResult as
    | { priorAuthId?: string; status?: string; decision?: string }
    | { submitted?: false; status?: string; missingEvidence?: string[] }
    | undefined;
  const roi = packet.roi as
    | {
        transactionCostSavingsUsd?: number;
        minutesSavedBaseline?: number;
        bestCaseTimeSavedMinutes?: number;
      }
    | undefined;
  const priorAuthId =
    submission && "priorAuthId" in submission
      ? submission.priorAuthId
      : undefined;
  const decision =
    submission && "decision" in submission ? submission.decision : undefined;
  const evidence = packet.evidenceResult as
    | { matched?: unknown[]; missing?: Array<{ label?: string }> }
    | undefined;

  return `# PriorAuth Passport Audit Packet

Status: ${packet.status}
Case ID: ${String(packet.caseSummary.caseId ?? "pa-case-001")}
Patient: ${String(packet.caseSummary.patient ?? "Maya Patel")}
Service: ${String(packet.caseSummary.service ?? "CPT 93306")}
Payer: ${String(packet.caseSummary.payer ?? "Demo Health Plan")}
Agent: TrustedPriorAuthAgent

## Workflow Result
${packet.status === "Submitted" ? "Submitted electronically." : "Needs human review."}

## Payer Submission
PriorAuth ID: ${priorAuthId ?? "Not sent"}
Status: ${submission?.status ?? "not_submitted"}
Decision: ${decision ?? "skipped"}

## ROI
Manual provider cost: $10.97
Electronic provider cost: $5.79
Transaction savings: $${(roi?.transactionCostSavingsUsd ?? 5.18).toFixed(2)}
Baseline time saved: ${roi?.minutesSavedBaseline ?? 7} minutes
Best-case time saved: ${roi?.bestCaseTimeSavedMinutes ?? 14} minutes

## Evidence
Matched: ${evidence?.matched?.length ?? 0}/4
Missing: ${
    evidence?.missing?.length
      ? evidence.missing.map((item) => item.label).join(", ")
      : "None"
  }

## Safety
Synthetic data only.
No medical advice.
No treatment recommendation.
No approval or denial of care.
`;
}

function buildAuditPacket(input: Omit<AuditPacket, "title" | "safety" | "markdown">) {
  const packet = {
    title: "PriorAuth Passport Audit Packet" as const,
    safety: agentPolicy,
    ...input
  };

  return {
    ...packet,
    markdown: auditPacketMarkdown(packet)
  } satisfies AuditPacket;
}

export async function runPriorAuthWorkflowStream(input: {
  scenario: PriorAuthScenario;
  origin: string;
  emit: Emit;
}) {
  const ctx: Context = {
    runId: randomUUID(),
    caseId: "pa-case-001",
    scenario: input.scenario,
    origin: input.origin,
    emit: input.emit,
    delayMs: getDemoStepDelayMs(),
    proofRows: [],
    workflowSummary: []
  };

  await ctx.emit(
    event(ctx, "start", "Start electronic prior authorization run", "info", {
      agent: "Orchestrator",
      summary: "Streaming Vercel-ready internal route handler workflow.",
      caseInput: {
        caseId: ctx.caseId,
        patientId: "maya-001",
        serviceCode: "93306",
        payerId: "demo-health-plan",
        scenario: ctx.scenario
      }
    })
  );

  const priorAuthCase = await runStep(ctx, {
    phase: "load_case",
    agent: "IntakeAgent",
    label: "Load and validate prior-auth case",
    toolName: "loadPriorAuthCase",
    toolInput: { caseId: ctx.caseId },
    run: async () => getSeedCase(ctx.caseId),
    summarize: (result) =>
      `${result.patient.name} · CPT ${result.requestedService.code} · ${result.payer.name}`,
    output: (result) => ({
      caseId: result.caseId,
      patientId: result.patient.id,
      serviceCode: result.requestedService.code,
      payerId: result.payer.id
    }),
    resultDetails: (result) => ({ priorAuthCase: result })
  });

  const requirementsBody = {
    payerId: priorAuthCase.payer.id,
    memberId: priorAuthCase.patient.memberId,
    serviceCode: priorAuthCase.requestedService.code,
    diagnosisCodes: priorAuthCase.diagnoses.map((diagnosis) => diagnosis.code)
  };

  const requirements = await runStep(ctx, {
    phase: "discover_payer_requirements",
    agent: "RequirementsAgent",
    label: "Discover payer requirements",
    toolName: "getPayerRequirements",
    toolInput: requirementsBody,
    api: {
      label: "Payer requirements",
      source: "payer",
      method: "POST",
      path: routeMap.requirements,
      requestBody: requirementsBody
    },
    run: async () =>
      (
        await callInternalApi<PayerRequirements>(ctx, {
          id: "requirements",
          method: "POST",
          path: routeMap.requirements,
          source: "payer",
          body: requirementsBody
        })
      ).data,
    summarize: (result) =>
      `${result.requiredEvidence.length} required evidence items`,
    output: (result) => ({
      requiredEvidence: result.requiredEvidence.map((item) => item.id)
    }),
    resultDetails: (result) => ({
      requirements: result,
      ingestedData: {
        source: "payer",
        resourceType: "PayerRequirements",
        records: result.requiredEvidence.length,
        syntheticOnly: true,
        noMedicalDecisions: true
      }
    })
  });

  const patient = await runStep(ctx, {
    phase: "fetch_patient",
    agent: "EvidenceAgent",
    label: "Fetch patient demographics",
    toolName: "getPatient",
    toolInput: { patientId: priorAuthCase.patient.id },
    api: {
      label: "EHR patient",
      source: "ehr",
      method: "GET",
      path: routeMap.patient
    },
    run: async () =>
      (
        await callInternalApi<Record<string, unknown>>(ctx, {
          id: "patient",
          method: "GET",
          path: routeMap.patient,
          source: "ehr"
        })
      ).data,
    summarize: (result) => `Patient ${(result as { id?: string }).id}`,
    output: (result) => ({ patientId: (result as { id?: string }).id }),
    resultDetails: (result) => ({
      ingestedData: {
        source: "ehr",
        resourceType: "Patient",
        records: 1,
        patientId: (result as { id?: string }).id,
        syntheticOnly: true,
        noMedicalDecisions: true
      }
    })
  });

  const conditions = await runStep(ctx, {
    phase: "fetch_conditions",
    agent: "EvidenceAgent",
    label: "Fetch diagnosis list",
    toolName: "getConditions",
    toolInput: { patientId: priorAuthCase.patient.id },
    api: {
      label: "EHR conditions",
      source: "ehr",
      method: "GET",
      path: routeMap.conditions
    },
    run: async () =>
      (
        await callInternalApi<{ entry?: unknown[] }>(ctx, {
          id: "conditions",
          method: "GET",
          path: routeMap.conditions,
          source: "ehr"
        })
      ).data,
    summarize: (result) => `${result.entry?.length ?? 0} diagnosis resources`,
    output: (result) => ({ count: result.entry?.length ?? 0 }),
    resultDetails: (result) => ({
      ingestedData: {
        source: "ehr",
        resourceType: "Condition",
        records: result.entry?.length ?? 0,
        patientId: priorAuthCase.patient.id,
        syntheticOnly: true,
        noMedicalDecisions: true
      }
    })
  });

  const medications = await runStep(ctx, {
    phase: "fetch_medications",
    agent: "EvidenceAgent",
    label: "Fetch medication list",
    toolName: "getMedications",
    toolInput: { patientId: priorAuthCase.patient.id },
    api: {
      label: "EHR medications",
      source: "ehr",
      method: "GET",
      path: routeMap.medications
    },
    run: async () =>
      (
        await callInternalApi<{ entry?: unknown[] }>(ctx, {
          id: "medications",
          method: "GET",
          path: routeMap.medications,
          source: "ehr"
        })
      ).data,
    summarize: (result) => `${result.entry?.length ?? 0} medication resources`,
    output: (result) => ({ count: result.entry?.length ?? 0 }),
    resultDetails: (result) => ({
      ingestedData: {
        source: "ehr",
        resourceType: "MedicationRequest",
        records: result.entry?.length ?? 0,
        patientId: priorAuthCase.patient.id,
        syntheticOnly: true,
        noMedicalDecisions: true
      }
    })
  });

  const observationPath = routeMap.observations(ctx.scenario);
  const observations = await runStep(ctx, {
    phase: "fetch_observations",
    agent: "EvidenceAgent",
    label: "Fetch recent observations",
    toolName: "getObservations",
    toolInput: { patientId: priorAuthCase.patient.id, scenario: ctx.scenario },
    api: {
      label: "EHR observations",
      source: "ehr",
      method: "GET",
      path: observationPath
    },
    run: async () =>
      (
        await callInternalApi<{ entry?: unknown[] }>(ctx, {
          id: "observations",
          method: "GET",
          path: observationPath,
          source: "ehr"
        })
      ).data,
    summarize: (result) => `${result.entry?.length ?? 0} observation resources`,
    output: (result) => ({ count: result.entry?.length ?? 0 }),
    resultDetails: (result) => ({
      ingestedData: {
        source: "ehr",
        resourceType: "Observation",
        records: result.entry?.length ?? 0,
        patientId: priorAuthCase.patient.id,
        scenario: ctx.scenario,
        syntheticOnly: true,
        noMedicalDecisions: true
      }
    })
  });

  const documentPath = routeMap.documents(ctx.scenario);
  const documents = await runStep(ctx, {
    phase: "fetch_documents",
    agent: "EvidenceAgent",
    label: "Fetch supporting documents",
    toolName: "getDocuments",
    toolInput: { patientId: priorAuthCase.patient.id, scenario: ctx.scenario },
    api: {
      label: "EHR documents",
      source: "ehr",
      method: "GET",
      path: documentPath
    },
    run: async () =>
      (
        await callInternalApi<{ documents?: unknown[] }>(ctx, {
          id: "documents",
          method: "GET",
          path: documentPath,
          source: "ehr"
        })
      ).data,
    summarize: (result) => `${result.documents?.length ?? 0} documents`,
    output: (result) => ({ count: result.documents?.length ?? 0 }),
    resultDetails: (result) => ({
      ingestedData: {
        source: "ehr",
        resourceType: "DocumentReference",
        records: result.documents?.length ?? 0,
        patientId: priorAuthCase.patient.id,
        scenario: ctx.scenario,
        syntheticOnly: true,
        noMedicalDecisions: true
      }
    })
  });

  const evidence = await runStep(ctx, {
    phase: "match_evidence",
    agent: "EvidenceAgent",
    label: "Match evidence to payer requirements",
    toolName: "matchEvidence",
    toolInput: {
      requirements: requirements.requiredEvidence.length,
      patient: (patient as { id?: string }).id,
      documents: documents.documents?.length ?? 0
    },
    run: async () =>
      matchEvidence({
        requirements,
        conditions: conditions as {
          entry?: Array<{ resource?: { id?: string } }>;
        },
        medications: medications as {
          entry?: Array<{ resource?: { id?: string } }>;
        },
        observations: observations as {
          entry?: Array<{ resource?: { id?: string } }>;
        },
        documents: documents as {
          documents?: Array<{ id: string; type: string; status: string }>;
        }
      }),
    summarize: (result) =>
      result.complete
        ? `${result.matched.length}/4 evidence items matched`
        : `Missing ${result.missing.map((item) => item.label).join(", ")}`,
    output: (result) => ({
      complete: result.complete,
      matched: result.matched.length,
      missing: result.missing.map((item) => item.requirementId)
    }),
    resultDetails: (result) => ({
      evidence: result,
      ingestedData: {
        source: "core",
        resourceType: "EvidenceResult",
        records: result.matched.length + result.missing.length,
        complete: result.complete,
        syntheticOnly: true,
        noMedicalDecisions: true
      }
    })
  });

  const roiConfig = loadRoiConfig();
  const roiResult = calculatePerAuthRoi(roiConfig.input);
  const practiceRoi = calculatePracticeRoi(roiConfig.input);

  if (!evidence.complete) {
    const audit = createAuditEvent({
      runId: ctx.runId,
      caseId: ctx.caseId,
      evidence,
      roi: roiResult,
      status: "draft_missing_evidence"
    });
    const submission = {
      submitted: false,
      status: "needs_human_review",
      reason: "Missing required evidence",
      missingEvidence: evidence.missing.map((item) => item.requirementId)
    };
    const skippedProof: ProofRow = {
      id: "submit_skipped",
      method: "POST",
      path: routeMap.submit,
      status: "skipped",
      latencyMs: 0,
      source: "payer"
    };

    ctx.proofRows.push(skippedProof);

    const auditPacket = buildAuditPacket({
      status: "Needs human review",
      caseSummary: {
        caseId: ctx.caseId,
        patient: priorAuthCase.patient.name,
        service: `CPT ${priorAuthCase.requestedService.code}`,
        payer: priorAuthCase.payer.name
      },
      workflowSummary: ctx.workflowSummary,
      dataSources: [
        { name: "Synthetic EHR API", resourcesFetched: 5 },
        { name: "Payer API", requirementsFetched: true, submissionSkipped: true },
        { name: "ROI Config", source: roiConfig.sourceLabel },
        { name: "Agent Policy", rules: agentPolicy }
      ],
      payerRequirements: requirements,
      evidenceResult: evidence,
      submissionResult: submission,
      roi: roiResult,
      auditHashes: audit
    });

    await ctx.emit(
      event(ctx, "submit_prior_auth", "Block payer submission", "blocked", {
        agent: "SubmissionAgent",
        inputSummary: "evidence.complete=false",
        outputSummary: "Submission blocked before payer API.",
        toolCall: toolCall(
          "submit_prior_auth",
          "submitPriorAuth",
          "blocked",
          { caseId: ctx.caseId },
          submission
        ),
        apiExchange: apiExchange({
          id: "submit_prior_auth",
          label: "Payer submission",
          source: "payer",
          method: "POST",
          path: routeMap.submit,
          status: "blocked",
          responseBody: submission,
          summary: "POST /api/demo/payer/submit skipped"
        }),
        submission,
        summary: "Submission blocked. Human review required."
      })
    );

    await ctx.emit(
      event(ctx, "calculate_roi", "Calculate potential ROI", "passed", {
        agent: "ROIAgent",
        roi: roiResult,
        practiceRoi,
        summary: `$${roiResult.transactionCostSavingsUsd.toFixed(2)} potential savings if completed.`,
        toolCall: toolCall(
          "calculate_roi",
          "calculateRoi",
          "passed",
          { manualCost: 10.97, electronicCost: 5.79 },
          {
            transactionCostSavingsUsd: roiResult.transactionCostSavingsUsd,
            minutesSavedBaseline: roiResult.minutesSavedBaseline
          }
        )
      })
    );

    await ctx.emit(
      event(ctx, "write_audit", "Generate draft audit packet", "passed", {
        agent: "AuditAgent",
        audit,
        auditPacket,
        summary: "Draft audit packet generated.",
        toolCall: toolCall(
          "write_audit",
          "generateAuditPacket",
          "passed",
          { runId: ctx.runId, caseId: ctx.caseId },
          { auditId: audit.auditId, status: audit.status }
        )
      })
    );

    await ctx.emit(
      event(ctx, "blocked", "Generated Audit Packet: Needs human review", "blocked", {
        priorAuthCase,
        requirements,
        evidence,
        submission,
        roi: roiResult,
        practiceRoi,
        audit,
        auditPacket,
        dataSources: auditPacket.dataSources,
        summary: "Generated Audit Packet. Submission not sent."
      })
    );

    return;
  }

  const authPackage = await runStep(ctx, {
    phase: "build_package",
    agent: "SubmissionAgent",
    label: "Build electronic prior-auth package",
    toolName: "buildPriorAuthPackage",
    toolInput: { caseId: ctx.caseId, evidenceItems: evidence.matched.length },
    run: async () => buildPriorAuthPackage({ priorAuthCase, evidence }),
    summarize: (result) => `${result.evidence.length} evidence references`,
    output: (result) => result,
    resultDetails: (result) => ({ authPackage: result })
  });

  const submission = await runStep(ctx, {
    phase: "submit_prior_auth",
    agent: "SubmissionAgent",
    label: "Submit electronic prior authorization",
    toolName: "submitPriorAuth",
    toolInput: { caseId: ctx.caseId, evidenceItems: evidence.matched.length },
    api: {
      label: "Payer submission",
      source: "payer",
      method: "POST",
      path: routeMap.submit,
      requestBody: authPackage
    },
    run: async () =>
      (
        await callInternalApi<Record<string, unknown>>(ctx, {
          id: "submit",
          method: "POST",
          path: routeMap.submit,
          source: "payer",
          body: authPackage
        })
      ).data,
    summarize: (result) =>
      `${String(result.priorAuthId)} · ${String(result.decision)}`,
    output: (result) => ({
      priorAuthId: result.priorAuthId,
      decision: result.decision,
      status: result.status
    }),
    resultDetails: (result) => ({
      submission: result,
      ingestedData: {
        source: "payer",
        resourceType: "PriorAuthSubmission",
        records: 1,
        priorAuthId: result.priorAuthId,
        decision: result.decision,
        syntheticOnly: true,
        noMedicalDecisions: true
      }
    })
  });

  await ctx.emit(
    event(ctx, "calculate_roi", "Calculate savings", "passed", {
      agent: "ROIAgent",
      roi: roiResult,
      practiceRoi,
      summary: `$${roiResult.transactionCostSavingsUsd.toFixed(2)} saved · ${roiResult.minutesSavedBaseline} min baseline · ${roiResult.bestCaseTimeSavedMinutes} min best-case`,
      toolCall: toolCall(
        "calculate_roi",
        "calculateRoi",
        "passed",
        { manualCost: 10.97, electronicCost: 5.79 },
        {
          transactionCostSavingsUsd: roiResult.transactionCostSavingsUsd,
          minutesSavedBaseline: roiResult.minutesSavedBaseline,
          bestCaseTimeSavedMinutes: roiResult.bestCaseTimeSavedMinutes
        }
      )
    })
  );

  const audit = createAuditEvent({
    runId: ctx.runId,
    caseId: ctx.caseId,
    priorAuthId: String(submission.priorAuthId),
    evidence,
    roi: roiResult,
    status: "submitted"
  });
  const auditPacket = buildAuditPacket({
    status: "Submitted",
    caseSummary: {
      caseId: ctx.caseId,
      patient: priorAuthCase.patient.name,
      service: `CPT ${priorAuthCase.requestedService.code}`,
      payer: priorAuthCase.payer.name
    },
    workflowSummary: ctx.workflowSummary,
    dataSources: [
      { name: "Synthetic EHR API", resourcesFetched: 5 },
      { name: "Payer API", requirementsFetched: true, submissionSent: true },
      { name: "ROI Config", source: roiConfig.sourceLabel },
      { name: "Agent Policy", rules: agentPolicy }
    ],
    payerRequirements: requirements,
    evidenceResult: evidence,
    submissionResult: submission,
    roi: roiResult,
    auditHashes: audit
  });

  await ctx.emit(
    event(ctx, "write_audit", "Generate audit packet", "passed", {
      agent: "AuditAgent",
      audit,
      auditPacket,
      summary: `Audit packet generated: ${audit.auditId}`,
      toolCall: toolCall(
        "write_audit",
        "generateAuditPacket",
        "passed",
        { runId: ctx.runId, caseId: ctx.caseId },
        { auditId: audit.auditId, status: audit.status }
      )
    })
  );

  await ctx.emit(
    event(ctx, "complete", "Generated Audit Packet: Submitted", "passed", {
      priorAuthCase,
      requirements,
      evidence,
      authPackage,
      submission,
      roi: roiResult,
      practiceRoi,
      audit,
      auditPacket,
      dataSources: auditPacket.dataSources,
      summary: "Generated Audit Packet. Status: Submitted."
    })
  );
}

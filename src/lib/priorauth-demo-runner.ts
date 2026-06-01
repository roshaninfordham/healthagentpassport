import { randomUUID } from "node:crypto";
import {
  buildPriorAuthPackage,
  calculatePerAuthRoi,
  calculatePracticeRoi,
  createAuditEvent,
  getSeedCase,
  loadRoiConfig,
  matchEvidence,
  type ApiExchange,
  type EvidenceResult,
  type PriorAuthCase,
  type PriorAuthRunEvent,
  type PriorAuthScenario,
  type ToolCallRecord
} from "@priorauth/passport-core";
import { getDemoStepDelayMs } from "@/lib/demo-config";
import {
  getDemoSafety,
  getDemoWorkflowUrls,
  getInternalDemoStats
} from "@/lib/internal-demo-api";
import { ingestRunEvent } from "@/lib/live-events";

type RunContext = {
  runId: string;
  caseId: string;
  scenario: PriorAuthScenario;
  demoDelayMs: number;
  urls: ReturnType<typeof getDemoWorkflowUrls>;
  onEvent?: (event: PriorAuthRunEvent) => void | Promise<void>;
  persistEvents: boolean;
};

type StepMeta<T> = {
  toolCall: {
    id?: string;
    name: string;
    input: Record<string, unknown>;
  };
  apiExchange?: {
    id?: string;
    label: string;
    source: ApiExchange["source"];
    method: ApiExchange["method"];
    url: string;
    requestBody?: unknown;
  };
  summarize?: (result: T) => string;
  toolOutput?: (result: T) => Record<string, unknown>;
  apiResponse?: (result: T) => unknown;
  details?: (result: T) => Record<string, unknown>;
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

function countBundleEntries(value: unknown) {
  return (value as { entry?: unknown[] }).entry?.length ?? 0;
}

function countDocuments(value: unknown) {
  return (value as { documents?: unknown[] }).documents?.length ?? 0;
}

function buildEvidenceProofRows(evidence: EvidenceResult) {
  return [...evidence.matched, ...evidence.missing].map((item) => ({
    id: `evidence:${item.requirementId}`,
    label: item.label,
    source: item.source ?? "not_ingested",
    status: item.status,
    value: item.source ?? "Missing required synthetic evidence"
  }));
}

function buildRoiProofRows(roi: {
  transactionCostSavingsUsd?: number;
  minutesSavedBaseline?: number;
  bestCaseTimeSavedMinutes?: number;
}) {
  return [
    {
      id: "roi:transaction_cost_savings",
      label: "Transaction cost savings",
      source: "config/roi.yaml",
      status: "calculated",
      value: roi.transactionCostSavingsUsd
    },
    {
      id: "roi:baseline_minutes_saved",
      label: "Baseline minutes saved",
      source: "config/roi.yaml",
      status: "calculated",
      value: roi.minutesSavedBaseline
    },
    {
      id: "roi:best_case_minutes_saved",
      label: "Best-case minutes saved",
      source: "config/roi.yaml",
      status: "calculated",
      value: roi.bestCaseTimeSavedMinutes
    }
  ];
}

function buildAuditPacket(input: {
  priorAuthCase: PriorAuthCase;
  requirements: unknown;
  evidence: EvidenceResult;
  roi: unknown;
  practiceRoi: unknown;
  audit: unknown;
  submission: unknown;
  proofRows: unknown[];
}) {
  return {
    caseId: input.priorAuthCase.caseId,
    patientId: input.priorAuthCase.patient.id,
    payerId: input.priorAuthCase.payer.id,
    serviceCode: input.priorAuthCase.requestedService.code,
    requirements: input.requirements,
    evidence: input.evidence,
    roi: input.roi,
    practiceRoi: input.practiceRoi,
    audit: input.audit,
    submission: input.submission,
    proofRows: input.proofRows,
    ...getDemoSafety()
  };
}

async function readEhrStats(ctx: RunContext) {
  if (ctx.urls.ehr.internal) return getInternalDemoStats().ehr;
  return fetchJson(ctx.urls.ehr.stats().fetchUrl).catch(() => null);
}

async function readPayerStats(ctx: RunContext) {
  if (ctx.urls.payer.internal) return getInternalDemoStats().payer;
  return fetchJson(ctx.urls.payer.stats().fetchUrl).catch(() => null);
}

async function emit(
  ctx: RunContext,
  event: Omit<PriorAuthRunEvent, "id" | "runId" | "caseId" | "timestamp">
) {
  const runEvent = {
    ...event,
    id: randomUUID(),
    runId: ctx.runId,
    caseId: ctx.caseId,
    timestamp: new Date().toISOString()
  };

  if (ctx.persistEvents) {
    ingestRunEvent(runEvent, ctx.scenario);
  }

  await ctx.onEvent?.(runEvent);
}

async function runStep<T>(
  ctx: RunContext,
  phase: PriorAuthRunEvent["phase"],
  label: string,
  fn: () => Promise<T>,
  meta: StepMeta<T>
): Promise<T> {
  const started = Date.now();
  const toolId = meta.toolCall.id ?? phase;
  const apiId = meta.apiExchange?.id ?? phase;
  const runningToolCall: ToolCallRecord = {
    id: toolId,
    name: meta.toolCall.name,
    status: "running",
    input: meta.toolCall.input
  };
  const runningApiExchange: ApiExchange | undefined = meta.apiExchange
    ? {
        id: apiId,
        label: meta.apiExchange.label,
        source: meta.apiExchange.source,
        method: meta.apiExchange.method,
        url: meta.apiExchange.url,
        requestBody: meta.apiExchange.requestBody,
        status: "running",
        summary: `Calling ${meta.apiExchange.method} ${meta.apiExchange.url}`
      }
    : undefined;

  await emit(ctx, {
    phase,
    label,
    status: "running",
    details: {
      toolCall: runningToolCall,
      apiExchange: runningApiExchange,
      summary:
        runningApiExchange?.summary ??
        `Calling ${meta.toolCall.name}(${JSON.stringify(meta.toolCall.input)})`
    }
  });
  await sleep(ctx.demoDelayMs);

  try {
    const result = await fn();

    await emit(ctx, {
      phase,
      label,
      status: "passed",
      durationMs: Date.now() - started,
      details: {
        ...summarizeForUi(result),
        ...(meta.details?.(result) ?? {}),
        toolCall: {
          ...runningToolCall,
          status: "passed",
          output: meta.toolOutput?.(result) ?? summarizeForUi(result)
        },
        apiExchange: runningApiExchange
          ? {
              ...runningApiExchange,
              status: "passed",
              responseBody: meta.apiResponse?.(result) ?? result,
              summary: meta.summarize?.(result)
            }
          : undefined,
        summary: meta.summarize?.(result)
      }
    });

    return result;
  } catch (error) {
    await emit(ctx, {
      phase,
      label,
      status: "failed",
      durationMs: Date.now() - started,
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
        toolCall: {
          ...runningToolCall,
          status: "failed",
          output: {
            error: error instanceof Error ? error.message : "Unknown error"
          }
        },
        apiExchange: runningApiExchange
          ? {
              ...runningApiExchange,
              status: "failed",
              summary: error instanceof Error ? error.message : "Unknown error"
            }
          : undefined
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
  origin?: string;
  onEvent?: (event: PriorAuthRunEvent) => void | Promise<void>;
  persistEvents?: boolean;
  demoDelayMs?: number;
}) {
  const ctx: RunContext = {
    runId: input.runId,
    caseId: input.caseId,
    scenario: input.scenario,
    demoDelayMs: input.demoDelayMs ?? getDemoStepDelayMs(),
    urls: getDemoWorkflowUrls(input.origin),
    onEvent: input.onEvent,
    persistEvents: input.persistEvents ?? true
  };

  await emit(ctx, {
    phase: "start",
    label:
      input.scenario === "complete"
        ? "Start complete electronic prior-auth demo"
        : "Check missing evidence gaps",
    status: "info",
    details: {
      agents: [
        {
          id: "trusted-priorauth-agent",
          name: "TrustedPriorAuthAgent",
          role: "administrative_prior_authorization",
          scopes: requiredScopes
        }
      ],
      endpoints: {
        ehr: ctx.urls.ehr.baseDisplayUrl,
        payer: ctx.urls.payer.baseDisplayUrl,
        stream: ctx.urls.studio.ndjsonStream
      },
      safety: getDemoSafety(),
      summary:
        "Synthetic-only administrative prior-authorization workflow. No medical decisions are made."
    }
  });

  const priorAuthCase = await runStep(
    ctx,
    "load_case",
    "Load synthetic prior-auth case",
    async () => ({ priorAuthCase: getSeedCase(input.caseId) }),
    {
      toolCall: {
        name: "loadPriorAuthCase",
        input: { caseId: input.caseId }
      },
      summarize: (result) =>
        `Loaded ${result.priorAuthCase.caseId} for ${result.priorAuthCase.patient.name}.`,
      toolOutput: (result) => ({
        caseId: result.priorAuthCase.caseId,
        patientId: result.priorAuthCase.patient.id,
        serviceCode: result.priorAuthCase.requestedService.code
      })
    }
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
    }),
    {
      toolCall: {
        name: "verifyAgentIdentity",
        input: {
          agentId: "trusted-priorauth-agent",
          requiredScopes
        }
      },
      summarize: (result) =>
        `${result.agentId} verified with ${result.scopes.length} administrative scopes.`,
      toolOutput: (result) => ({
        signatureValid: result.signatureValid,
        delegationValid: result.delegationValid,
        scopes: result.scopes
      }),
      details: (result) => ({
        agent: {
          id: result.agentId,
          name: "TrustedPriorAuthAgent",
          role: "administrative_prior_authorization",
          signatureValid: result.signatureValid,
          delegationValid: result.delegationValid,
          scopes: result.scopes,
          ...getDemoSafety()
        }
      })
    }
  );

  const patientUrl = ctx.urls.ehr.patient(priorAuthCase.patient.id);
  const patient = await runStep(
    ctx,
    "fetch_patient",
    "Fetch patient demographics from synthetic EHR",
    async () => fetchJson(patientUrl.fetchUrl),
    {
      toolCall: {
        name: "fetchEhrResource",
        input: { resource: "Patient", id: priorAuthCase.patient.id }
      },
      apiExchange: {
        label: "EHR Patient request",
        source: "ehr",
        method: "GET",
        url: patientUrl.displayUrl
      },
      summarize: (result) =>
        `Fetched synthetic patient ${(result as { id?: string }).id ?? priorAuthCase.patient.id}.`,
      details: (result) => ({
        ingestedData: {
          source: "ehr",
          resourceType: "Patient",
          records: 1,
          patientId: (result as { id?: string }).id ?? priorAuthCase.patient.id,
          ...getDemoSafety()
        }
      })
    }
  );

  const conditionUrl = ctx.urls.ehr.conditions(priorAuthCase.patient.id);
  const conditions = await runStep(
    ctx,
    "fetch_conditions",
    "Fetch diagnosis list",
    async () => fetchJson(conditionUrl.fetchUrl),
    {
      toolCall: {
        name: "fetchEhrResource",
        input: { resource: "Condition", patient: priorAuthCase.patient.id }
      },
      apiExchange: {
        label: "EHR Condition request",
        source: "ehr",
        method: "GET",
        url: conditionUrl.displayUrl
      },
      summarize: (result) =>
        `Found ${countBundleEntries(result)} diagnosis resources.`,
      details: (result) => ({
        ingestedData: {
          source: "ehr",
          resourceType: "Condition",
          records: countBundleEntries(result),
          patientId: priorAuthCase.patient.id,
          ...getDemoSafety()
        }
      })
    }
  );

  const medicationUrl = ctx.urls.ehr.medications(priorAuthCase.patient.id);
  const medications = await runStep(
    ctx,
    "fetch_medications",
    "Fetch active medication list",
    async () => fetchJson(medicationUrl.fetchUrl),
    {
      toolCall: {
        name: "fetchEhrResource",
        input: {
          resource: "MedicationRequest",
          patient: priorAuthCase.patient.id
        }
      },
      apiExchange: {
        label: "EHR MedicationRequest request",
        source: "ehr",
        method: "GET",
        url: medicationUrl.displayUrl
      },
      summarize: (result) =>
        `Found ${countBundleEntries(result)} medication resources.`,
      details: (result) => ({
        ingestedData: {
          source: "ehr",
          resourceType: "MedicationRequest",
          records: countBundleEntries(result),
          patientId: priorAuthCase.patient.id,
          ...getDemoSafety()
        }
      })
    }
  );

  const observationUrl = ctx.urls.ehr.observations(
    priorAuthCase.patient.id,
    input.scenario
  );
  const observations = await runStep(
    ctx,
    "fetch_observations",
    "Fetch recent clinical observations",
    async () => fetchJson(observationUrl.fetchUrl),
    {
      toolCall: {
        name: "fetchEhrResource",
        input: {
          resource: "Observation",
          patient: priorAuthCase.patient.id,
          scenario: input.scenario
        }
      },
      apiExchange: {
        label: "EHR Observation request",
        source: "ehr",
        method: "GET",
        url: observationUrl.displayUrl
      },
      summarize: (result) =>
        `Found ${countBundleEntries(result)} recent observation resources.`,
      details: (result) => ({
        ingestedData: {
          source: "ehr",
          resourceType: "Observation",
          records: countBundleEntries(result),
          patientId: priorAuthCase.patient.id,
          scenario: input.scenario,
          ...getDemoSafety()
        }
      })
    }
  );

  const documentsUrl = ctx.urls.ehr.documents(
    priorAuthCase.patient.id,
    input.scenario
  );
  const documents = await runStep(
    ctx,
    "fetch_documents",
    "Fetch available supporting documents",
    async () => fetchJson(documentsUrl.fetchUrl),
    {
      toolCall: {
        name: "fetchEhrDocuments",
        input: { patient: priorAuthCase.patient.id, scenario: input.scenario }
      },
      apiExchange: {
        label: "EHR documents request",
        source: "ehr",
        method: "GET",
        url: documentsUrl.displayUrl
      },
      summarize: (result) =>
        `Found ${countDocuments(result)} supporting documents.`,
      details: (result) => ({
        ingestedData: {
          source: "ehr",
          resourceType: "DocumentReference",
          records: countDocuments(result),
          patientId: priorAuthCase.patient.id,
          scenario: input.scenario,
          ...getDemoSafety()
        }
      })
    }
  );

  const requirementsUrl = ctx.urls.payer.requirements();
  const requirementsBody = {
    payerId: priorAuthCase.payer.id,
    memberId: priorAuthCase.patient.memberId,
    serviceCode: priorAuthCase.requestedService.code,
    diagnosisCodes: priorAuthCase.diagnoses.map((diagnosis) => diagnosis.code)
  };
  const requirements = await runStep(
    ctx,
    "discover_payer_requirements",
    "Discover payer documentation requirements",
    async () => ({
      requirements: await postJson(requirementsUrl.fetchUrl, requirementsBody)
    }),
    {
      toolCall: {
        name: "discoverPayerRequirements",
        input: requirementsBody
      },
      apiExchange: {
        label: "Payer requirements request",
        source: "payer",
        method: "POST",
        url: requirementsUrl.displayUrl,
        requestBody: requirementsBody
      },
      apiResponse: (result) => result.requirements,
      summarize: (result) =>
        `Discovered ${result.requirements.requiredEvidence.length} required evidence items.`,
      details: (result) => ({
        ingestedData: {
          source: "payer",
          resourceType: "PayerRequirements",
          records: result.requirements.requiredEvidence.length,
          payer: result.requirements.payer,
          serviceCode: result.requirements.serviceCode,
          ...getDemoSafety()
        }
      })
    }
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
    }),
    {
      toolCall: {
        name: "matchEvidence",
        input: {
          requirements: requirements.requiredEvidence.length,
          availableDocuments:
            (documents as { documents?: unknown[] }).documents?.length ?? 0,
          conditionResources:
            (conditions as { entry?: unknown[] }).entry?.length ?? 0,
          observationResources:
            (observations as { entry?: unknown[] }).entry?.length ?? 0
        }
      },
      summarize: (result) =>
        result.evidence.complete
          ? `Evidence complete: ${result.evidence.matched.length}/${requirements.requiredEvidence.length} matched.`
          : `Evidence incomplete: missing ${result.evidence.missing.map((item) => item.label).join(", ")}.`,
      toolOutput: (result) => ({
        complete: result.evidence.complete,
        matched: result.evidence.matched.length,
        missing: result.evidence.missing.map((item) => item.requirementId)
      }),
      details: (result) => ({
        proofRows: buildEvidenceProofRows(result.evidence),
        ingestedData: {
          source: "core",
          resourceType: "EvidenceResult",
          records: result.evidence.matched.length + result.evidence.missing.length,
          complete: result.evidence.complete,
          ...getDemoSafety()
        }
      })
    }
  ).then((result) => result.evidence);

  if (!evidence.complete) {
    const roiConfig = loadRoiConfig();
    const roi = await runStep(
      ctx,
      "calculate_roi",
      "Calculate potential ROI for blocked case",
      async () => ({
        roi: calculatePerAuthRoi(roiConfig.input),
        practiceRoi: calculatePracticeRoi(roiConfig.input),
        roiSource: roiConfig.sourceLabel
      }),
      {
        toolCall: {
          name: "calculateRoi",
          input: {
            manualCost: roiConfig.input.manualProviderCostUsd,
            electronicCost: roiConfig.input.electronicProviderCostUsd,
            status: "potential_if_completed"
          }
        },
        summarize: (result) =>
          `Potential savings if completed: $${result.roi.transactionCostSavingsUsd.toFixed(2)} and ${result.roi.minutesSavedBaseline} minutes.`,
        toolOutput: (result) => ({
          transactionCostSavingsUsd: result.roi.transactionCostSavingsUsd,
          minutesSavedBaseline: result.roi.minutesSavedBaseline
        }),
        details: (result) => ({
          proofRows: buildRoiProofRows(result.roi),
          ingestedData: {
            source: "core",
            resourceType: "RoiCalculation",
            records: 1,
            roiSource: result.roiSource,
            ...getDemoSafety()
          }
        })
      }
    );
    const blockedSubmission = {
      submitted: false,
      status: "not_submitted",
      reason: "Missing required evidence",
      missingEvidence: evidence.missing.map((item) => item.requirementId)
    };
    const blockedProofRows = [
      ...buildEvidenceProofRows(evidence),
      ...buildRoiProofRows(roi.roi)
    ];
    const audit = await runStep(
      ctx,
      "write_audit",
      "Write draft audit evidence",
      async () => ({
        audit: createAuditEvent({
          runId: ctx.runId,
          caseId: ctx.caseId,
          evidence,
          roi: roi.roi,
          status: "draft_missing_evidence"
        })
      }),
      {
        toolCall: {
          name: "writeAuditEvidence",
          input: {
            runId: ctx.runId,
            caseId: ctx.caseId,
            status: "draft_missing_evidence"
          }
        },
        summarize: (result) =>
          `Draft audit evidence written: ${result.audit.auditId}.`,
        toolOutput: (result) => ({
          auditId: result.audit.auditId,
          evidenceHash: result.audit.evidenceHash,
          roiHash: result.audit.roiHash
        }),
        details: (result) => ({
          auditPacket: buildAuditPacket({
            priorAuthCase,
            requirements,
            evidence,
            roi: roi.roi,
            practiceRoi: roi.practiceRoi,
            audit: result.audit,
            submission: blockedSubmission,
            proofRows: blockedProofRows
          })
        })
      }
    ).then((result) => result.audit);

    const [ehrStats, payerStats] = await Promise.all([
      readEhrStats(ctx),
      readPayerStats(ctx)
    ]);
    const blockedSubmitUrl = ctx.urls.payer.submit();
    const auditPacket = buildAuditPacket({
      priorAuthCase,
      requirements,
      evidence,
      roi: roi.roi,
      practiceRoi: roi.practiceRoi,
      audit,
      submission: blockedSubmission,
      proofRows: blockedProofRows
    });

    await emit(ctx, {
      phase: "blocked",
      label: "Missing evidence detected. Draft saved; payer submission not sent.",
      status: "blocked",
      details: {
        evidence,
        roi: roi.roi,
        practiceRoi: roi.practiceRoi,
        audit,
        auditPacket,
        proofRows: blockedProofRows,
        ehrStats,
        payerStats,
        toolCall: {
          id: "guardrail_block_submission",
          name: "blockSubmissionWhenEvidenceMissing",
          status: "blocked",
          input: {
            missingEvidence: evidence.missing.map((item) => item.requirementId)
          },
          output: {
            submitted: false,
            reason: "Missing required evidence"
          }
        } satisfies ToolCallRecord,
        apiExchange: {
          id: "submit_prior_auth",
          label: "Payer prior-auth submission",
          source: "payer",
          method: "POST",
          url: blockedSubmitUrl.displayUrl,
          status: "blocked",
          requestBody: null,
          responseBody: blockedSubmission,
          summary: "No payer submission was sent because evidence is incomplete."
        } satisfies ApiExchange,
        summary: "Submission blocked. Human review required.",
        submission: blockedSubmission,
        safety: getDemoSafety()
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
    }),
    {
      toolCall: {
        name: "buildPriorAuthPackage",
        input: {
          caseId: priorAuthCase.caseId,
          evidenceItems: evidence.matched.length
        }
      },
      summarize: (result) =>
        `Built package with ${(result.authPackage as { evidence?: unknown[] }).evidence?.length ?? 0} evidence references.`,
      toolOutput: (result) => result.authPackage as Record<string, unknown>,
      details: (result) => ({
        ingestedData: {
          source: "core",
          resourceType: "PriorAuthPackage",
          records:
            (result.authPackage as { evidence?: unknown[] }).evidence?.length ??
            0,
          caseId: priorAuthCase.caseId,
          ...getDemoSafety()
        }
      })
    }
  ).then((result) => result.authPackage);

  const submitUrl = ctx.urls.payer.submit();
  const submission = await runStep(
    ctx,
    "submit_prior_auth",
    "Submit electronic prior authorization to payer API",
    async () => ({
      submission: await postJson(submitUrl.fetchUrl, authPackage)
    }),
    {
      toolCall: {
        name: "submitPriorAuthPackage",
        input: {
          caseId: priorAuthCase.caseId,
          evidenceItems: evidence.matched.length
        }
      },
      apiExchange: {
        label: "Payer prior-auth submission",
        source: "payer",
        method: "POST",
        url: submitUrl.displayUrl,
        requestBody: authPackage
      },
      apiResponse: (result) => result.submission,
      summarize: (result) =>
        `Submitted package. PriorAuth ID: ${(result.submission as { priorAuthId?: string }).priorAuthId}; decision: ${(result.submission as { decision?: string }).decision}.`,
      details: (result) => ({
        ingestedData: {
          source: "payer",
          resourceType: "PriorAuthSubmission",
          records: 1,
          priorAuthId: (result.submission as { priorAuthId?: string })
            .priorAuthId,
          decision: (result.submission as { decision?: string }).decision,
          ...getDemoSafety()
        }
      })
    }
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
    }),
    {
      toolCall: {
        name: "calculateRoi",
        input: {
          manualCost: roiConfig.input.manualProviderCostUsd,
          electronicCost: roiConfig.input.electronicProviderCostUsd,
          manualMinutes: roiConfig.input.manualTimeMinutes,
          electronicMinutes: roiConfig.input.electronicTimeMinutes
        }
      },
      summarize: (result) =>
        `$${result.roi.transactionCostSavingsUsd.toFixed(2)} saved; ${result.roi.minutesSavedBaseline} baseline minutes saved.`,
      toolOutput: (result) => ({
        transactionCostSavingsUsd: result.roi.transactionCostSavingsUsd,
        minutesSavedBaseline: result.roi.minutesSavedBaseline,
        bestCaseTimeSavedMinutes: result.roi.bestCaseTimeSavedMinutes
      }),
      details: (result) => ({
        proofRows: buildRoiProofRows(result.roi),
        ingestedData: {
          source: "core",
          resourceType: "RoiCalculation",
          records: 1,
          roiSource: result.roiSource,
          ...getDemoSafety()
        }
      })
    }
  );
  const completeProofRows = [
    ...buildEvidenceProofRows(evidence),
    ...buildRoiProofRows(roi.roi)
  ];

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
    }),
    {
      toolCall: {
        name: "writeAuditEvidence",
        input: {
          runId: ctx.runId,
          caseId: ctx.caseId,
          priorAuthId: (submission as { priorAuthId?: string }).priorAuthId,
          status: "submitted"
        }
      },
      summarize: (result) =>
        `Audit evidence written: ${result.audit.auditId}.`,
      toolOutput: (result) => ({
        auditId: result.audit.auditId,
        evidenceHash: result.audit.evidenceHash,
        roiHash: result.audit.roiHash
      }),
      details: (result) => ({
        auditPacket: buildAuditPacket({
          priorAuthCase,
          requirements,
          evidence,
          roi: roi.roi,
          practiceRoi: roi.practiceRoi,
          audit: result.audit,
          submission,
          proofRows: completeProofRows
        })
      })
    }
  ).then((result) => result.audit);

  const [ehrStats, payerStats] = await Promise.all([
    readEhrStats(ctx),
    readPayerStats(ctx)
  ]);
  const auditPacket = buildAuditPacket({
    priorAuthCase,
    requirements,
    evidence,
    roi: roi.roi,
    practiceRoi: roi.practiceRoi,
    audit,
    submission,
    proofRows: completeProofRows
  });

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
      auditPacket,
      proofRows: completeProofRows,
      ehrStats,
      payerStats,
      safety: getDemoSafety()
    }
  });
}

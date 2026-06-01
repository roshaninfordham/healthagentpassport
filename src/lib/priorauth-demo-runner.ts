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
  type PriorAuthRunEvent,
  type PriorAuthScenario,
  type ToolCallRecord
} from "@priorauth/passport-core";
import { getDemoStepDelayMs } from "@/lib/demo-config";
import { ingestRunEvent } from "@/lib/live-events";

type RunContext = {
  runId: string;
  caseId: string;
  scenario: PriorAuthScenario;
  demoDelayMs: number;
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
}) {
  const ehrBaseUrl = process.env.EHR_API_URL ?? "http://localhost:4001";
  const payerBaseUrl = process.env.PAYER_API_URL ?? "http://localhost:4002";
  const ctx: RunContext = {
    runId: input.runId,
    caseId: input.caseId,
    scenario: input.scenario,
    demoDelayMs: getDemoStepDelayMs()
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
      })
    }
  );

  const patientUrl = `${ehrBaseUrl}/fhir/Patient/${priorAuthCase.patient.id}`;
  const patient = await runStep(
    ctx,
    "fetch_patient",
    "Fetch patient demographics from synthetic EHR",
    async () => fetchJson(patientUrl),
    {
      toolCall: {
        name: "fetchEhrResource",
        input: { resource: "Patient", id: priorAuthCase.patient.id }
      },
      apiExchange: {
        label: "EHR Patient request",
        source: "ehr",
        method: "GET",
        url: patientUrl
      },
      summarize: (result) =>
        `Fetched synthetic patient ${(result as { id?: string }).id ?? priorAuthCase.patient.id}.`
    }
  );

  const conditionUrl = `${ehrBaseUrl}/fhir/Condition?patient=${priorAuthCase.patient.id}`;
  const conditions = await runStep(
    ctx,
    "fetch_conditions",
    "Fetch diagnosis list",
    async () => fetchJson(conditionUrl),
    {
      toolCall: {
        name: "fetchEhrResource",
        input: { resource: "Condition", patient: priorAuthCase.patient.id }
      },
      apiExchange: {
        label: "EHR Condition request",
        source: "ehr",
        method: "GET",
        url: conditionUrl
      },
      summarize: (result) =>
        `Found ${(result as { entry?: unknown[] }).entry?.length ?? 0} diagnosis resources.`
    }
  );

  const medicationUrl = `${ehrBaseUrl}/fhir/MedicationRequest?patient=${priorAuthCase.patient.id}`;
  const medications = await runStep(
    ctx,
    "fetch_medications",
    "Fetch active medication list",
    async () => fetchJson(medicationUrl),
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
        url: medicationUrl
      },
      summarize: (result) =>
        `Found ${(result as { entry?: unknown[] }).entry?.length ?? 0} medication resources.`
    }
  );

  const observationUrl = `${ehrBaseUrl}/fhir/Observation?patient=${priorAuthCase.patient.id}&scenario=${input.scenario}`;
  const observations = await runStep(
    ctx,
    "fetch_observations",
    "Fetch recent clinical observations",
    async () => fetchJson(observationUrl),
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
        url: observationUrl
      },
      summarize: (result) =>
        `Found ${(result as { entry?: unknown[] }).entry?.length ?? 0} recent observation resources.`
    }
  );

  const documentsUrl = `${ehrBaseUrl}/documents?patient=${priorAuthCase.patient.id}&scenario=${input.scenario}`;
  const documents = await runStep(
    ctx,
    "fetch_documents",
    "Fetch available supporting documents",
    async () => fetchJson(documentsUrl),
    {
      toolCall: {
        name: "fetchEhrDocuments",
        input: { patient: priorAuthCase.patient.id, scenario: input.scenario }
      },
      apiExchange: {
        label: "EHR documents request",
        source: "ehr",
        method: "GET",
        url: documentsUrl
      },
      summarize: (result) =>
        `Found ${(result as { documents?: unknown[] }).documents?.length ?? 0} supporting documents.`
    }
  );

  const requirementsUrl = `${payerBaseUrl}/prior-auth/requirements`;
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
      requirements: await postJson(requirementsUrl, requirementsBody)
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
        url: requirementsUrl,
        requestBody: requirementsBody
      },
      apiResponse: (result) => result.requirements,
      summarize: (result) =>
        `Discovered ${result.requirements.requiredEvidence.length} required evidence items.`
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
        })
      }
    );
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
        })
      }
    ).then((result) => result.audit);

    const [ehrStats, payerStats] = await Promise.all([
      fetchJson(`${ehrBaseUrl}/stats`).catch(() => null),
      fetchJson(`${payerBaseUrl}/stats`).catch(() => null)
    ]);

    await emit(ctx, {
      phase: "blocked",
      label: "Missing evidence detected. Draft saved; payer submission not sent.",
      status: "blocked",
      details: {
        evidence,
        roi: roi.roi,
        practiceRoi: roi.practiceRoi,
        audit,
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
          url: `${payerBaseUrl}/prior-auth/submit`,
          status: "blocked",
          requestBody: null,
          responseBody: {
            submitted: false,
            reason: "Missing required evidence",
            missingEvidence: evidence.missing.map((item) => item.requirementId)
          },
          summary: "No payer submission was sent because evidence is incomplete."
        } satisfies ApiExchange,
        summary: "Submission blocked. Human review required.",
        submission: {
          submitted: false,
          status: "not_submitted",
          reason: "Missing required evidence",
          missingEvidence: evidence.missing.map((item) => item.requirementId)
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
      toolOutput: (result) => result.authPackage as Record<string, unknown>
    }
  ).then((result) => result.authPackage);

  const submitUrl = `${payerBaseUrl}/prior-auth/submit`;
  const submission = await runStep(
    ctx,
    "submit_prior_auth",
    "Submit electronic prior authorization to payer API",
    async () => ({
      submission: await postJson(submitUrl, authPackage)
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
        url: submitUrl,
        requestBody: authPackage
      },
      apiResponse: (result) => result.submission,
      summarize: (result) =>
        `Submitted package. PriorAuth ID: ${(result.submission as { priorAuthId?: string }).priorAuthId}; decision: ${(result.submission as { decision?: string }).decision}.`
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
      })
    }
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
      })
    }
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

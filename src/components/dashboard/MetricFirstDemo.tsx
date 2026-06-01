"use client";

import { useMemo, useState } from "react";
import type {
  ApiExchange,
  EvidenceResult,
  PayerRequirements,
  PriorAuthCase,
  ToolCallRecord,
} from "@priorauth/passport-core";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Braces,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  DatabaseZap,
  Download,
  FileCheck2,
  FileClock,
  Gauge,
  LockKeyhole,
  PackageCheck,
  Play,
  RotateCcw,
  ShieldCheck,
  Timer,
  Waypoints,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { PriorAuthRunEvent, PriorAuthRunResult } from "@/lib/live-events";

type Scenario = "complete" | "incomplete";
type RunStatus = "idle" | "running" | "submitted" | "blocked" | "failed";
type Tone = "cyan" | "emerald" | "amber" | "rose" | "slate";
type StageStatus = "waiting" | "active" | "done" | "blocked" | "failed";

type MetricComponentProps = {
  result?: PriorAuthRunResult;
  events?: PriorAuthRunEvent[];
  loading?: boolean | Scenario | null;
  className?: string;
};

type RunControlProps = {
  onRun?: (scenario: Scenario) => void;
  onReset?: () => void;
  onDeveloperMode?: () => void;
  resetting?: boolean;
};

export type MetricFirstLandingProps = MetricComponentProps & RunControlProps;
export type ProblemOutcomeMetricsProps = MetricComponentProps;
export type AgentWorkflowDiagramProps = MetricComponentProps;
export type LiveDemoWorkspaceProps = MetricComponentProps & RunControlProps;
export type AgentTimelineProps = MetricComponentProps;
export type DataIngestPanelProps = MetricComponentProps;
export type ToolCallsPanelProps = MetricComponentProps;
export type RequestResponseInspectorProps = MetricComponentProps;
export type EvidenceChecklistProps = MetricComponentProps;
export type OutcomePanelProps = MetricComponentProps;
export type AuditPacketDocumentProps = MetricComponentProps;
export type ProofOfWorkPanelProps = MetricComponentProps;

type RoiResult = {
  manualProviderCostUsd: number;
  electronicProviderCostUsd: number;
  manualTimeMinutes: number;
  electronicTimeMinutes: number;
  transactionCostSavingsUsd: number;
  minutesSavedBaseline: number;
  bestCaseTimeSavedMinutes: number;
  netSavingsAfterPlatformFeeUsd: number;
};

type SubmissionView = {
  priorAuthId?: string;
  decision?: string;
  status?: string;
  submitted?: boolean;
  reason?: string;
  missingEvidence?: string[];
};

type AuditView = {
  auditId?: string;
  status?: string;
  evidenceHash?: string;
  roiHash?: string;
  createdAt?: string;
  syntheticOnly?: boolean;
};

type ProofRowView = {
  id: string;
  method: string;
  path: string;
  status: string;
  latencyMs: number;
  hash?: string;
  source: string;
};

type MetricModel = {
  roi: RoiResult;
  submission: SubmissionView;
  audit: AuditView;
  requirements?: PayerRequirements;
  evidence?: EvidenceResult;
  runStatus: RunStatus;
  costReductionPercent: number;
  eventCount: number;
  apiCount: number;
  ehrApiCount: number;
  payerApiCount: number;
  toolCount: number;
  passedToolCount: number;
  blockedToolCount: number;
  matchedEvidenceCount: number;
  missingEvidenceCount: number;
  evidenceTotal: number;
  evidenceRate: number;
  durationMs: number;
  auditHashCount: number;
};

const fallbackRoi: RoiResult = {
  manualProviderCostUsd: 10.97,
  electronicProviderCostUsd: 5.79,
  manualTimeMinutes: 16,
  electronicTimeMinutes: 9,
  transactionCostSavingsUsd: 5.18,
  minutesSavedBaseline: 7,
  bestCaseTimeSavedMinutes: 14,
  netSavingsAfterPlatformFeeUsd: 3.93,
};

const fallbackCase: PriorAuthCase = {
  caseId: "pa-case-001",
  patient: {
    id: "maya-001",
    name: "Maya Patel",
    dob: "1978-04-12",
    memberId: "DEMO-MEMBER-8841",
  },
  provider: {
    npi: "1234567890",
    name: "Dr. Sarah Chen",
    organization: "Demo Cardiology Group",
  },
  payer: {
    id: "demo-health-plan",
    name: "Demo Health Plan",
  },
  requestedService: {
    codeSystem: "CPT",
    code: "93306",
    display: "Transthoracic echocardiography",
    serviceCategory: "Cardiology",
  },
  diagnoses: [
    {
      codeSystem: "ICD-10",
      code: "I10",
      display: "Essential hypertension",
    },
    {
      codeSystem: "ICD-10",
      code: "E11.9",
      display: "Type 2 diabetes mellitus",
    },
  ],
};

const fallbackRequirements: PayerRequirements = {
  requiresPriorAuth: true,
  serviceCode: "93306",
  serviceName: "Transthoracic echocardiography",
  payer: "Demo Health Plan",
  expectedManualTimeMinutes: 16,
  expectedElectronicTimeMinutes: 9,
  bestCaseElectronicTimeSavedMinutes: 14,
  requiredEvidence: [
    { id: "referral_note", label: "Referral note", required: true },
    {
      id: "recent_vitals_or_observation",
      label: "Recent observation",
      required: true,
    },
    { id: "medication_list", label: "Medication list", required: true },
    { id: "diagnosis_list", label: "Diagnosis list", required: true },
  ],
};

const panelClass =
  "glass-panel min-h-min min-w-0 overflow-hidden break-words rounded-lg p-5";
const tileClass =
  "min-h-min min-w-0 overflow-hidden break-words rounded-lg border p-4";
const softTileClass =
  "min-h-min min-w-0 overflow-hidden break-words rounded-lg border border-white/10 bg-white/[0.04] p-4";

const toneClasses: Record<Tone, string> = {
  cyan: "border-cyan-400/25 bg-cyan-400/10",
  emerald: "border-emerald-400/25 bg-emerald-400/10",
  amber: "border-amber-400/25 bg-amber-400/10",
  rose: "border-rose-400/25 bg-rose-400/10",
  slate: "border-white/10 bg-white/[0.04]",
};

const toneIconClasses: Record<Tone, string> = {
  cyan: "text-cyan-300",
  emerald: "text-emerald-300",
  amber: "text-amber-300",
  rose: "text-rose-300",
  slate: "text-slate-300",
};

const runStatusTone: Record<RunStatus, Tone> = {
  idle: "slate",
  running: "cyan",
  submitted: "emerald",
  blocked: "amber",
  failed: "rose",
};

const stageStatusClasses: Record<StageStatus, string> = {
  waiting: "border-white/10 bg-white/[0.035] text-slate-300",
  active: "border-cyan-400/30 bg-cyan-400/10 text-cyan-50",
  done: "border-emerald-400/25 bg-emerald-400/10 text-emerald-50",
  blocked: "border-amber-400/30 bg-amber-400/10 text-amber-50",
  failed: "border-rose-400/30 bg-rose-400/10 text-rose-50",
};

const workflowStages: Array<{
  id: string;
  label: string;
  metric: string;
  phases: PriorAuthRunEvent["phase"][];
  icon: LucideIcon;
}> = [
  {
    id: "intake",
    label: "Intake",
    metric: "case",
    phases: ["start", "load_case"],
    icon: ClipboardCheck,
  },
  {
    id: "agent",
    label: "Agent",
    metric: "scopes",
    phases: ["verify_agent"],
    icon: LockKeyhole,
  },
  {
    id: "ehr",
    label: "EHR",
    metric: "5 reads",
    phases: [
      "fetch_patient",
      "fetch_conditions",
      "fetch_medications",
      "fetch_observations",
      "fetch_documents",
    ],
    icon: DatabaseZap,
  },
  {
    id: "rules",
    label: "Rules",
    metric: "payer",
    phases: ["discover_payer_requirements"],
    icon: BadgeCheck,
  },
  {
    id: "evidence",
    label: "Evidence",
    metric: "match",
    phases: ["match_evidence"],
    icon: FileCheck2,
  },
  {
    id: "package",
    label: "Package",
    metric: "FHIR refs",
    phases: ["build_package"],
    icon: PackageCheck,
  },
  {
    id: "submit",
    label: "Submit",
    metric: "guarded",
    phases: ["submit_prior_auth", "blocked"],
    icon: ArrowRight,
  },
  {
    id: "proof",
    label: "Proof",
    metric: "hashes",
    phases: ["calculate_roi", "write_audit", "complete", "blocked"],
    icon: ShieldCheck,
  },
];

const phaseLabels: Record<PriorAuthRunEvent["phase"], string> = {
  start: "Start",
  load_case: "Case",
  verify_agent: "Agent",
  fetch_patient: "Patient",
  fetch_conditions: "Dx",
  fetch_medications: "Meds",
  fetch_observations: "Obs",
  fetch_documents: "Docs",
  discover_payer_requirements: "Rules",
  match_evidence: "Evidence",
  build_package: "Package",
  submit_prior_auth: "Submit",
  calculate_roi: "ROI",
  write_audit: "Audit",
  complete: "Done",
  blocked: "Blocked",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function numberField(
  value: Record<string, unknown>,
  key: string,
  fallback: number,
) {
  const candidate = value[key];
  return typeof candidate === "number" && Number.isFinite(candidate)
    ? candidate
    : fallback;
}

function stringField(value: Record<string, unknown>, key: string) {
  const candidate = value[key];
  return typeof candidate === "string" ? candidate : undefined;
}

function booleanField(value: Record<string, unknown>, key: string) {
  const candidate = value[key];
  return typeof candidate === "boolean" ? candidate : undefined;
}

function stringArrayField(value: Record<string, unknown>, key: string) {
  const candidate = value[key];
  return Array.isArray(candidate)
    ? candidate.filter((item): item is string => typeof item === "string")
    : undefined;
}

function asRoi(value: unknown): RoiResult {
  if (!isRecord(value)) return fallbackRoi;

  return {
    manualProviderCostUsd: numberField(
      value,
      "manualProviderCostUsd",
      fallbackRoi.manualProviderCostUsd,
    ),
    electronicProviderCostUsd: numberField(
      value,
      "electronicProviderCostUsd",
      fallbackRoi.electronicProviderCostUsd,
    ),
    manualTimeMinutes: numberField(
      value,
      "manualTimeMinutes",
      fallbackRoi.manualTimeMinutes,
    ),
    electronicTimeMinutes: numberField(
      value,
      "electronicTimeMinutes",
      fallbackRoi.electronicTimeMinutes,
    ),
    transactionCostSavingsUsd: numberField(
      value,
      "transactionCostSavingsUsd",
      fallbackRoi.transactionCostSavingsUsd,
    ),
    minutesSavedBaseline: numberField(
      value,
      "minutesSavedBaseline",
      fallbackRoi.minutesSavedBaseline,
    ),
    bestCaseTimeSavedMinutes: numberField(
      value,
      "bestCaseTimeSavedMinutes",
      fallbackRoi.bestCaseTimeSavedMinutes,
    ),
    netSavingsAfterPlatformFeeUsd: numberField(
      value,
      "netSavingsAfterPlatformFeeUsd",
      fallbackRoi.netSavingsAfterPlatformFeeUsd,
    ),
  };
}

function asSubmission(value: unknown): SubmissionView {
  if (!isRecord(value)) return {};

  return {
    priorAuthId: stringField(value, "priorAuthId"),
    decision: stringField(value, "decision"),
    status: stringField(value, "status"),
    submitted: booleanField(value, "submitted"),
    reason: stringField(value, "reason"),
    missingEvidence: stringArrayField(value, "missingEvidence"),
  };
}

function asAudit(value: unknown): AuditView {
  if (!isRecord(value)) return {};

  return {
    auditId: stringField(value, "auditId"),
    status: stringField(value, "status"),
    evidenceHash: stringField(value, "evidenceHash"),
    roiHash: stringField(value, "roiHash"),
    createdAt: stringField(value, "createdAt"),
    syntheticOnly: booleanField(value, "syntheticOnly"),
  };
}

function asProofRows(value: unknown): ProofRowView[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((item, index) => ({
      id: stringField(item, "id") ?? `proof-${index + 1}`,
      method: stringField(item, "method") ?? "GET",
      path: stringField(item, "path") ?? "/",
      status: String(item.status ?? "pending"),
      latencyMs: numberField(item, "latencyMs", 0),
      hash: stringField(item, "hash"),
      source: stringField(item, "source") ?? "core",
    }));
}

function isLoading(loading: MetricComponentProps["loading"]) {
  return loading === true || loading === "complete" || loading === "incomplete";
}

function deriveRunStatus(
  events: PriorAuthRunEvent[],
  result: PriorAuthRunResult | undefined,
  loading: MetricComponentProps["loading"],
): RunStatus {
  if (events.some((event) => event.status === "failed")) return "failed";

  const submission = asSubmission(result?.submission);
  const latestEvent = events[events.length - 1];

  if (
    latestEvent?.phase === "blocked" ||
    latestEvent?.status === "blocked" ||
    submission.submitted === false
  ) {
    return "blocked";
  }

  if (
    latestEvent?.phase === "complete" ||
    submission.priorAuthId ||
    submission.status === "pending_payer_review"
  ) {
    return "submitted";
  }

  if (isLoading(loading) || events.length > 0) return "running";
  return "idle";
}

function deriveMetrics(
  result: PriorAuthRunResult | undefined,
  events: PriorAuthRunEvent[],
  loading: MetricComponentProps["loading"],
): MetricModel {
  const roi = asRoi(result?.roi);
  const submission = asSubmission(result?.submission);
  const audit = asAudit(result?.audit);
  const evidence = result?.evidence;
  const requirements = result?.requirements;
  const toolCalls = result?.toolCalls ?? [];
  const apiExchanges = result?.apiExchanges ?? [];
  const evidenceTotal =
    (evidence?.matched.length ?? 0) + (evidence?.missing.length ?? 0) ||
    requirements?.requiredEvidence.length ||
    fallbackRequirements.requiredEvidence.length;
  const matchedEvidenceCount = evidence?.matched.length ?? 0;
  const missingEvidenceCount =
    evidence?.missing.length ??
    Math.max(evidenceTotal - matchedEvidenceCount, 0);
  const costReductionPercent =
    roi.manualProviderCostUsd > 0
      ? ((roi.manualProviderCostUsd - roi.electronicProviderCostUsd) /
          roi.manualProviderCostUsd) *
        100
      : 0;

  return {
    roi,
    submission,
    audit,
    requirements,
    evidence,
    runStatus: deriveRunStatus(events, result, loading),
    costReductionPercent,
    eventCount: events.length,
    apiCount: apiExchanges.length,
    ehrApiCount: apiExchanges.filter((item) => item.source === "ehr").length,
    payerApiCount: apiExchanges.filter((item) => item.source === "payer")
      .length,
    toolCount: toolCalls.length,
    passedToolCount: toolCalls.filter((item) => item.status === "passed")
      .length,
    blockedToolCount: toolCalls.filter((item) => item.status === "blocked")
      .length,
    matchedEvidenceCount,
    missingEvidenceCount,
    evidenceTotal,
    evidenceRate:
      evidenceTotal > 0 ? (matchedEvidenceCount / evidenceTotal) * 100 : 0,
    durationMs: events.reduce(
      (total, event) => total + (event.durationMs ?? 0),
      0,
    ),
    auditHashCount: [audit.evidenceHash, audit.roiHash].filter(Boolean).length,
  };
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function integer(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number) {
  return `${integer(value)}%`;
}

function duration(value: number) {
  if (!value) return "0 ms";
  if (value < 1000) return `${integer(value)} ms`;
  return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} s`;
}

function renderJson(value: unknown) {
  const text = JSON.stringify(value ?? {}, null, 2);
  return text.length > 9000 ? `${text.slice(0, 9000)}\n...` : text;
}

function compactTime(timestamp?: string) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function statusLabel(status: RunStatus) {
  if (status === "submitted") return "Submitted";
  if (status === "blocked") return "Blocked";
  if (status === "failed") return "Failed";
  if (status === "running") return "Live";
  return "Ready";
}

function statusDetail(metrics: MetricModel) {
  if (metrics.runStatus === "submitted") {
    return metrics.submission.priorAuthId ?? "Payer accepted packet";
  }
  if (metrics.runStatus === "blocked") {
    return metrics.submission.reason ?? "Evidence guardrail";
  }
  if (metrics.runStatus === "failed") return "Run failed";
  if (metrics.runStatus === "running") return `${metrics.eventCount} events`;
  return "Run a case";
}

function latestEventForPhases(
  events: PriorAuthRunEvent[],
  phases: PriorAuthRunEvent["phase"][],
) {
  return [...events].reverse().find((event) => phases.includes(event.phase));
}

function getStageStatus(
  events: PriorAuthRunEvent[],
  phases: PriorAuthRunEvent["phase"][],
): StageStatus {
  const latest = latestEventForPhases(events, phases);
  if (!latest) return "waiting";
  if (latest.status === "failed") return "failed";
  if (latest.status === "blocked") return "blocked";
  if (latest.status === "running") return "active";
  if (latest.status === "passed" || latest.phase === "complete") return "done";
  return "waiting";
}

function statusIcon(status: StageStatus | ToolCallRecord["status"]) {
  if (status === "done" || status === "passed") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
  }
  if (status === "blocked") {
    return <AlertTriangle className="h-4 w-4 text-amber-300" />;
  }
  if (status === "failed") {
    return <XCircle className="h-4 w-4 text-rose-300" />;
  }
  return <Gauge className="h-4 w-4 text-cyan-300" />;
}

function statusDotClass(status: PriorAuthRunEvent["status"]) {
  if (status === "passed") return "bg-emerald-300";
  if (status === "blocked") return "bg-amber-300";
  if (status === "failed") return "bg-rose-300";
  if (status === "running") return "bg-cyan-300";
  return "bg-slate-400";
}

function buildAuditPacket(
  events: PriorAuthRunEvent[],
  result: PriorAuthRunResult | undefined,
) {
  const submission = asSubmission(result?.submission);
  const serverPacket = isRecord(result?.auditPacket) ? result.auditPacket : null;

  return {
    title: "Prior Authorization Audit Packet",
    runId: events[0]?.runId ?? null,
    caseId: events[0]?.caseId ?? result?.priorAuthCase?.caseId ?? null,
    syntheticOnly: true,
    medicalDecisionMade: false,
    serverPacket,
    payerDecision: submission.decision ?? submission.status ?? "not_submitted",
    audit: asAudit(result?.audit),
    roi: result?.roi ?? null,
    evidence: result?.evidence ?? null,
    submission: result?.submission ?? null,
    proofRows: asProofRows(result?.proofRows),
    eventCount: events.length,
    events: events.map((event) => ({
      phase: event.phase,
      status: event.status,
      label: event.label,
      timestamp: event.timestamp,
      durationMs: event.durationMs,
    })),
  };
}

function PanelHeader({
  icon: Icon,
  title,
  metric,
  tone = "cyan",
}: {
  icon: LucideIcon;
  title: string;
  metric?: string;
  tone?: Tone;
}) {
  return (
    <div className="flex min-h-min min-w-0 items-center justify-between gap-3 overflow-hidden">
      <div className="flex min-w-0 items-center gap-2 overflow-hidden">
        <Icon className={`h-5 w-5 shrink-0 ${toneIconClasses[tone]}`} />
        <h2 className="min-w-0 overflow-hidden break-words text-sm font-semibold text-white">
          {title}
        </h2>
      </div>
      {metric ? (
        <span className="min-h-min shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-medium text-slate-200">
          {metric}
        </span>
      ) : null}
    </div>
  );
}

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  tone = "cyan",
}: {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <div className={`${tileClass} ${toneClasses[tone]}`}>
      <div className="flex min-w-0 items-center justify-between gap-3 overflow-hidden">
        <p className="min-w-0 overflow-hidden break-words text-xs font-medium uppercase text-slate-300">
          {label}
        </p>
        <Icon className={`h-4 w-4 shrink-0 ${toneIconClasses[tone]}`} />
      </div>
      <p className="mt-3 min-w-0 overflow-hidden break-words text-2xl font-semibold leading-tight text-white sm:text-3xl">
        {value}
      </p>
      {detail ? (
        <p className="mt-2 min-w-0 overflow-hidden break-words text-xs leading-5 text-slate-300">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function ScenarioButtons({
  loading,
  resetting,
  onRun,
  onReset,
  onDeveloperMode,
}: Pick<
  MetricFirstLandingProps,
  "loading" | "resetting" | "onRun" | "onReset" | "onDeveloperMode"
>) {
  const disabled = isLoading(loading) || resetting;

  return (
    <div className="flex min-h-min min-w-0 flex-wrap gap-2 overflow-hidden">
      <button
        type="button"
        disabled={disabled || !onRun}
        onClick={() => onRun?.("complete")}
        className="inline-flex min-h-10 min-w-0 items-center justify-center gap-2 overflow-hidden break-words rounded-md border border-emerald-400/35 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play className="h-4 w-4 shrink-0" />
        Start live demo
      </button>
      <button
        type="button"
        disabled={disabled || !onRun}
        onClick={() => onRun?.("incomplete")}
        className="inline-flex min-h-10 min-w-0 items-center justify-center gap-2 overflow-hidden break-words rounded-md border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Check gaps
      </button>
      {onDeveloperMode ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onDeveloperMode}
          className="inline-flex min-h-10 min-w-0 items-center justify-center gap-2 overflow-hidden break-words rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Braces className="h-4 w-4 shrink-0" />
          Quickstart
        </button>
      ) : null}
      {onReset ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onReset}
          className="inline-flex min-h-10 min-w-0 items-center justify-center gap-2 overflow-hidden break-words rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4 shrink-0" />
          Reset
        </button>
      ) : null}
    </div>
  );
}

export function MetricFirstLanding({
  result,
  events = [],
  loading = null,
  onRun,
  onReset,
  onDeveloperMode,
  resetting = false,
  className = "",
}: MetricFirstLandingProps) {
  const metrics = deriveMetrics(result, events, loading);
  const tone = runStatusTone[metrics.runStatus];
  const priorAuthCase = result?.priorAuthCase ?? fallbackCase;

  return (
    <section
      className={`grid min-h-min min-w-0 gap-5 overflow-hidden break-words rounded-lg border border-white/10 bg-[#070a12] bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[length:42px_42px] p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_360px] ${className}`}
    >
      <div className="grid min-h-min min-w-0 gap-5 overflow-hidden">
        <div className="flex min-h-min min-w-0 flex-wrap items-center gap-2 overflow-hidden">
          <span
            className={`min-h-min min-w-0 overflow-hidden break-words rounded-md border px-3 py-1.5 text-xs font-semibold uppercase ${toneClasses[tone]}`}
          >
            {statusLabel(metrics.runStatus)}
          </span>
          <span className="min-h-min min-w-0 overflow-hidden break-words rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold uppercase text-slate-200">
            Synthetic data only
          </span>
          <span className="min-h-min min-w-0 overflow-hidden break-words rounded-md border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold uppercase text-cyan-100">
            Real EHR + payer APIs
          </span>
        </div>

        <div className="grid min-h-min min-w-0 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <div className="min-w-0 overflow-hidden">
            <h1 className="min-w-0 overflow-hidden break-words text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              PriorAuth Passport
            </h1>
            <p className="mt-3 min-w-0 overflow-hidden break-words text-lg font-medium text-cyan-100">
              AI-powered electronic prior authorization agent.
            </p>
          </div>

          <div className="grid min-h-min min-w-0 content-start gap-3 overflow-hidden">
            <ScenarioButtons
              loading={loading}
              resetting={resetting}
              onRun={onRun}
              onReset={onReset}
              onDeveloperMode={onDeveloperMode}
            />
            <div className={`${softTileClass} py-3`}>
              <p className="text-xs font-medium uppercase text-slate-400">
                Current case
              </p>
              <p className="mt-1 min-w-0 overflow-hidden break-words text-sm font-semibold text-white">
                {priorAuthCase.requestedService.code} /{" "}
                {priorAuthCase.payer.name}
              </p>
            </div>
          </div>
        </div>

        <div className="grid min-h-min min-w-0 gap-3 overflow-hidden sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Cost delta"
            value={money(metrics.roi.transactionCostSavingsUsd)}
            detail={`${percent(metrics.costReductionPercent)} lower transaction cost`}
            icon={Gauge}
            tone="cyan"
          />
          <MetricTile
            label="Time"
            value={`${metrics.roi.bestCaseTimeSavedMinutes} min`}
            detail={`${metrics.roi.minutesSavedBaseline} min baseline`}
            icon={Timer}
            tone="emerald"
          />
          <MetricTile
            label="Evidence"
            value={`${metrics.matchedEvidenceCount}/${metrics.evidenceTotal}`}
            detail={`${metrics.missingEvidenceCount} missing`}
            icon={ClipboardCheck}
            tone={metrics.missingEvidenceCount > 0 ? "amber" : "emerald"}
          />
          <MetricTile
            label="Proof"
            value={`${metrics.auditHashCount}/2`}
            detail={statusDetail(metrics)}
            icon={ShieldCheck}
            tone={metrics.auditHashCount === 2 ? "emerald" : tone}
          />
        </div>
      </div>

      <aside className="grid min-h-min min-w-0 content-start gap-3 overflow-hidden">
        {workflowStages.slice(0, 6).map((stage) => {
          const stageStatus = getStageStatus(events, stage.phases);
          const latest = latestEventForPhases(events, stage.phases);
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              className={`min-h-min min-w-0 overflow-hidden break-words rounded-lg border p-3 ${stageStatusClasses[stageStatus]}`}
            >
              <div className="flex min-w-0 items-center justify-between gap-3 overflow-hidden">
                <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                  <Icon className="h-4 w-4 shrink-0" />
                  <p className="min-w-0 overflow-hidden break-words text-sm font-semibold">
                    {stage.label}
                  </p>
                </div>
                <span className="shrink-0 text-xs uppercase opacity-80">
                  {stage.metric}
                </span>
              </div>
              {latest ? (
                <p className="mt-2 min-w-0 overflow-hidden break-words text-xs leading-5 opacity-85">
                  {phaseLabels[latest.phase]} / {latest.status}
                </p>
              ) : null}
            </div>
          );
        })}
      </aside>
    </section>
  );
}

export function ProblemOutcomeMetrics({
  result,
  events = [],
  loading = null,
  className = "",
}: ProblemOutcomeMetricsProps) {
  const metrics = deriveMetrics(result, events, loading);

  return (
    <section className={`${panelClass} ${className}`}>
      <PanelHeader
        icon={Gauge}
        title="Problem to outcome"
        metric={statusLabel(metrics.runStatus)}
        tone={runStatusTone[metrics.runStatus]}
      />

      <div className="mt-4 grid min-h-min min-w-0 gap-3 overflow-hidden md:grid-cols-3">
        <div className={`${tileClass} border-rose-400/25 bg-rose-400/10`}>
          <p className="text-xs font-medium uppercase text-rose-100">Manual</p>
          <div className="mt-3 grid min-w-0 grid-cols-2 gap-3 overflow-hidden">
            <p className="min-w-0 overflow-hidden break-words text-2xl font-semibold text-white">
              {money(metrics.roi.manualProviderCostUsd)}
            </p>
            <p className="min-w-0 overflow-hidden break-words text-2xl font-semibold text-white">
              {metrics.roi.manualTimeMinutes} min
            </p>
          </div>
          <p className="mt-2 text-xs text-rose-50/80">Portal work</p>
        </div>

        <div className={`${tileClass} border-cyan-400/25 bg-cyan-400/10`}>
          <p className="text-xs font-medium uppercase text-cyan-100">Agent</p>
          <div className="mt-3 grid min-w-0 grid-cols-2 gap-3 overflow-hidden">
            <p className="min-w-0 overflow-hidden break-words text-2xl font-semibold text-white">
              {money(metrics.roi.electronicProviderCostUsd)}
            </p>
            <p className="min-w-0 overflow-hidden break-words text-2xl font-semibold text-white">
              {metrics.roi.electronicTimeMinutes} min
            </p>
          </div>
          <p className="mt-2 text-xs text-cyan-50/80">API workflow</p>
        </div>

        <div className={`${tileClass} border-emerald-400/25 bg-emerald-400/10`}>
          <p className="text-xs font-medium uppercase text-emerald-100">
            Outcome
          </p>
          <div className="mt-3 grid min-w-0 grid-cols-2 gap-3 overflow-hidden">
            <p className="min-w-0 overflow-hidden break-words text-2xl font-semibold text-white">
              {money(metrics.roi.transactionCostSavingsUsd)}
            </p>
            <p className="min-w-0 overflow-hidden break-words text-2xl font-semibold text-white">
              {metrics.roi.minutesSavedBaseline} min
            </p>
          </div>
          <p className="mt-2 text-xs text-emerald-50/80">
            {percent(metrics.costReductionPercent)} lower
          </p>
        </div>
      </div>

      <div className="mt-3 grid min-h-min min-w-0 gap-3 overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="Evidence"
          value={`${metrics.matchedEvidenceCount}/${metrics.evidenceTotal}`}
          detail={`${percent(metrics.evidenceRate)} matched`}
          icon={ClipboardCheck}
          tone={metrics.missingEvidenceCount > 0 ? "amber" : "emerald"}
        />
        <MetricTile
          label="API calls"
          value={integer(metrics.apiCount)}
          detail={`${metrics.ehrApiCount} EHR / ${metrics.payerApiCount} payer`}
          icon={DatabaseZap}
          tone="cyan"
        />
        <MetricTile
          label="Tools"
          value={integer(metrics.toolCount)}
          detail={`${metrics.blockedToolCount} blocked`}
          icon={Wrench}
          tone={metrics.blockedToolCount > 0 ? "amber" : "slate"}
        />
        <MetricTile
          label="Audit"
          value={`${metrics.auditHashCount}/2`}
          detail={metrics.audit.auditId ?? "No packet yet"}
          icon={ShieldCheck}
          tone={metrics.auditHashCount === 2 ? "emerald" : "slate"}
        />
      </div>
    </section>
  );
}

export function AgentWorkflowDiagram({
  result,
  events = [],
  loading = null,
  className = "",
}: AgentWorkflowDiagramProps) {
  const metrics = deriveMetrics(result, events, loading);

  return (
    <section className={`${panelClass} ${className}`}>
      <PanelHeader
        icon={Waypoints}
        title="Agent workflow"
        metric={`${metrics.eventCount} events`}
        tone={runStatusTone[metrics.runStatus]}
      />

      <div className="mt-4 grid min-h-min min-w-0 gap-3 overflow-hidden md:grid-cols-4 xl:grid-cols-8">
        {workflowStages.map((stage, index) => {
          const Icon = stage.icon;
          const stageStatus = getStageStatus(events, stage.phases);
          const latest = latestEventForPhases(events, stage.phases);

          return (
            <article
              key={stage.id}
              className={`grid min-h-[128px] min-w-0 content-between overflow-hidden break-words rounded-lg border p-3 ${stageStatusClasses[stageStatus]}`}
            >
              <div className="grid min-w-0 gap-3 overflow-hidden">
                <div className="flex min-w-0 items-center justify-between gap-2 overflow-hidden">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="shrink-0 text-xs opacity-75">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="min-w-0 overflow-hidden">
                  <h3 className="min-w-0 overflow-hidden break-words text-sm font-semibold">
                    {stage.label}
                  </h3>
                  <p className="mt-1 min-w-0 overflow-hidden break-words text-xs opacity-75">
                    {latest ? phaseLabels[latest.phase] : stage.metric}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex min-w-0 items-center justify-between gap-2 overflow-hidden text-xs">
                <span className="min-w-0 overflow-hidden break-words uppercase opacity-80">
                  {stageStatus}
                </span>
                {latest?.durationMs ? (
                  <span className="shrink-0 opacity-80">
                    {duration(latest.durationMs)}
                  </span>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function LiveDemoWorkspace({
  result,
  events = [],
  loading = null,
  onRun,
  onReset,
  resetting = false,
  className = "",
}: LiveDemoWorkspaceProps) {
  const metrics = deriveMetrics(result, events, loading);

  return (
    <section
      className={`grid min-h-min min-w-0 gap-5 overflow-hidden ${className}`}
    >
      <div className="grid min-h-min min-w-0 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,auto)] lg:items-center">
        <div className="min-w-0 overflow-hidden">
          <p className="text-xs font-medium uppercase text-slate-400">
            Live demo
          </p>
          <h2 className="mt-1 min-w-0 overflow-hidden break-words text-2xl font-semibold text-white">
            Metrics first. Workflow visible.
          </h2>
        </div>
        <ScenarioButtons
          loading={loading}
          resetting={resetting}
          onRun={onRun}
          onReset={onReset}
        />
      </div>

      <ProblemOutcomeMetrics
        result={result}
        events={events}
        loading={loading}
      />
      <AgentWorkflowDiagram result={result} events={events} loading={loading} />

      <div className="grid min-h-min min-w-0 gap-5 overflow-hidden xl:grid-cols-[360px_minmax(0,1fr)_420px]">
        <div className="grid min-h-min min-w-0 content-start gap-5 overflow-hidden">
          <OutcomePanel result={result} events={events} loading={loading} />
          <EvidenceChecklist
            result={result}
            events={events}
            loading={loading}
          />
        </div>

        <div className="grid min-h-min min-w-0 content-start gap-5 overflow-hidden">
          <AgentTimeline result={result} events={events} loading={loading} />
          <DataIngestPanel result={result} events={events} loading={loading} />
        </div>

        <div className="grid min-h-min min-w-0 content-start gap-5 overflow-hidden">
          <ToolCallsPanel result={result} events={events} loading={loading} />
          <RequestResponseInspector
            result={result}
            events={events}
            loading={loading}
          />
        </div>
      </div>

      <div className="grid min-h-min min-w-0 gap-5 overflow-hidden lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <ProofOfWorkPanel result={result} events={events} loading={loading} />
        <AuditPacketDocument
          result={result}
          events={events}
          loading={loading}
        />
      </div>

      {metrics.runStatus === "blocked" ? (
        <div className="min-h-min min-w-0 overflow-hidden break-words rounded-lg border border-amber-400/25 bg-amber-400/10 p-4 text-sm font-medium text-amber-50">
          Missing evidence stopped payer submission.
        </div>
      ) : null}
    </section>
  );
}

export function AgentTimeline({
  result,
  events = [],
  loading = null,
  className = "",
}: AgentTimelineProps) {
  const metrics = deriveMetrics(result, events, loading);
  const visibleEvents = [...events].reverse().slice(0, 12);

  return (
    <section className={`${panelClass} ${className}`}>
      <PanelHeader
        icon={Timer}
        title="Timeline"
        metric={isLoading(loading) ? "Streaming" : `${events.length} events`}
        tone={runStatusTone[metrics.runStatus]}
      />

      <div className="mt-4 grid min-h-min min-w-0 gap-3 overflow-hidden sm:grid-cols-3">
        <MetricTile
          label="Events"
          value={integer(metrics.eventCount)}
          icon={Waypoints}
          tone="cyan"
        />
        <MetricTile
          label="Step time"
          value={duration(metrics.durationMs)}
          icon={Timer}
          tone="slate"
        />
        <MetricTile
          label="Status"
          value={statusLabel(metrics.runStatus)}
          icon={Gauge}
          tone={runStatusTone[metrics.runStatus]}
        />
      </div>

      <div className="mt-4 grid max-h-[460px] min-h-min min-w-0 gap-3 overflow-auto pr-1">
        {visibleEvents.length === 0 ? (
          <div className="min-h-min min-w-0 overflow-hidden break-words rounded-lg border border-dashed border-white/15 p-5 text-sm text-slate-400">
            Run a case to stream agent work.
          </div>
        ) : (
          visibleEvents.map((event) => (
            <article
              key={event.id}
              className="min-h-min min-w-0 overflow-hidden break-words rounded-lg border border-white/10 bg-white/[0.035] p-3"
            >
              <div className="flex min-w-0 items-start gap-3 overflow-hidden">
                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClass(event.status)}`}
                />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex min-w-0 flex-wrap items-center gap-2 overflow-hidden">
                    <p className="min-w-0 overflow-hidden break-words text-sm font-semibold text-white">
                      {phaseLabels[event.phase]}
                    </p>
                    <span className="rounded-md border border-white/10 bg-black/15 px-2 py-0.5 text-xs uppercase text-slate-300">
                      {event.status}
                    </span>
                    {event.durationMs ? (
                      <span className="text-xs text-slate-400">
                        {duration(event.durationMs)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 min-w-0 overflow-hidden break-words text-xs leading-5 text-slate-300">
                    {event.label}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-500">
                  {compactTime(event.timestamp)}
                </span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export function DataIngestPanel({
  result,
  events = [],
  loading = null,
  className = "",
}: DataIngestPanelProps) {
  const metrics = deriveMetrics(result, events, loading);
  const exchanges = [...(result?.apiExchanges ?? [])].reverse();

  return (
    <section className={`${panelClass} ${className}`}>
      <PanelHeader
        icon={DatabaseZap}
        title="Data ingest"
        metric={`${metrics.apiCount} calls`}
      />

      <div className="mt-4 grid min-h-min min-w-0 gap-3 overflow-hidden sm:grid-cols-3">
        <MetricTile
          label="EHR"
          value={integer(metrics.ehrApiCount)}
          detail="FHIR reads"
          icon={DatabaseZap}
          tone="cyan"
        />
        <MetricTile
          label="Payer"
          value={integer(metrics.payerApiCount)}
          detail="rules / submit"
          icon={BadgeCheck}
          tone="emerald"
        />
        <MetricTile
          label="Core"
          value={integer(Math.max(metrics.toolCount - metrics.apiCount, 0))}
          detail="local tools"
          icon={Wrench}
          tone="slate"
        />
      </div>

      <div className="mt-4 grid max-h-[420px] min-h-min min-w-0 gap-3 overflow-auto pr-1">
        {exchanges.length === 0 ? (
          <div className="min-h-min min-w-0 overflow-hidden break-words rounded-lg border border-dashed border-white/15 p-5 text-sm text-slate-400">
            API exchanges land here.
          </div>
        ) : (
          exchanges.map((exchange) => (
            <article
              key={exchange.id}
              className="min-h-min min-w-0 overflow-hidden break-words rounded-lg border border-white/10 bg-white/[0.035] p-3"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2 overflow-hidden">
                <span className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5 font-mono text-xs text-cyan-100">
                  {exchange.method}
                </span>
                <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs uppercase text-slate-300">
                  {exchange.source}
                </span>
                <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs uppercase text-slate-300">
                  {exchange.status}
                </span>
              </div>
              <p className="mt-2 min-w-0 overflow-hidden break-all font-mono text-xs leading-5 text-slate-300">
                {exchange.url}
              </p>
              {exchange.summary ? (
                <p className="mt-2 min-w-0 overflow-hidden break-words text-xs leading-5 text-slate-400">
                  {exchange.summary}
                </p>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export function ToolCallsPanel({
  result,
  events = [],
  loading = null,
  className = "",
}: ToolCallsPanelProps) {
  const metrics = deriveMetrics(result, events, loading);
  const toolCalls = [...(result?.toolCalls ?? [])].reverse();

  return (
    <section className={`${panelClass} ${className}`}>
      <PanelHeader
        icon={Wrench}
        title="Tool calls"
        metric={`${metrics.passedToolCount}/${metrics.toolCount} passed`}
        tone={metrics.blockedToolCount > 0 ? "amber" : "cyan"}
      />

      <div className="mt-4 grid min-h-min min-w-0 grid-cols-3 gap-3 overflow-hidden">
        <MetricTile
          label="Total"
          value={integer(metrics.toolCount)}
          icon={Wrench}
          tone="cyan"
        />
        <MetricTile
          label="Passed"
          value={integer(metrics.passedToolCount)}
          icon={CheckCircle2}
          tone="emerald"
        />
        <MetricTile
          label="Blocked"
          value={integer(metrics.blockedToolCount)}
          icon={AlertTriangle}
          tone={metrics.blockedToolCount > 0 ? "amber" : "slate"}
        />
      </div>

      <div className="mt-4 grid max-h-[460px] min-h-min min-w-0 gap-3 overflow-auto pr-1">
        {toolCalls.length === 0 ? (
          <div className="min-h-min min-w-0 overflow-hidden break-words rounded-lg border border-dashed border-white/15 p-5 text-sm text-slate-400">
            Agent tools appear as the run executes.
          </div>
        ) : (
          toolCalls.map((call) => (
            <article
              key={call.id}
              className="min-h-min min-w-0 overflow-hidden break-words rounded-lg border border-white/10 bg-white/[0.035] p-3"
            >
              <div className="flex min-w-0 items-start justify-between gap-3 overflow-hidden">
                <div className="min-w-0 overflow-hidden">
                  <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                    {statusIcon(call.status)}
                    <p className="min-w-0 overflow-hidden break-words text-sm font-semibold text-white">
                      {call.name}
                    </p>
                  </div>
                  <p className="mt-2 min-w-0 overflow-hidden break-all font-mono text-xs leading-5 text-slate-400">
                    {call.id}
                  </p>
                </div>
                <span className="shrink-0 rounded-md border border-white/10 bg-black/15 px-2 py-0.5 text-xs uppercase text-slate-300">
                  {call.status}
                </span>
              </div>
              {call.output ? (
                <pre className="mt-3 max-h-32 max-w-full overflow-auto rounded-md border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-300">
                  {renderJson(call.output)}
                </pre>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export function RequestResponseInspector({
  result,
  events = [],
  loading = null,
  className = "",
}: RequestResponseInspectorProps) {
  const metrics = deriveMetrics(result, events, loading);
  const exchanges = useMemo(
    () => [...(result?.apiExchanges ?? [])].reverse(),
    [result?.apiExchanges],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pane, setPane] = useState<"request" | "response">("response");
  const selected =
    exchanges.find((exchange) => exchange.id === activeId) ?? exchanges[0];
  const payload =
    pane === "request"
      ? {
          method: selected?.method,
          url: selected?.url,
          body: selected?.requestBody ?? null,
        }
      : (selected?.responseBody ?? {
          status: selected?.status ?? statusLabel(metrics.runStatus),
        });

  return (
    <section className={`${panelClass} ${className}`}>
      <PanelHeader
        icon={Braces}
        title="Request / response"
        metric={selected?.source ?? "none"}
      />

      <div className="mt-4 grid min-h-min min-w-0 gap-3 overflow-hidden">
        <div className="flex min-h-min min-w-0 gap-2 overflow-auto pb-1">
          {exchanges.length === 0 ? (
            <span className="min-h-9 rounded-md border border-dashed border-white/15 px-3 py-2 text-sm text-slate-400">
              No API call yet
            </span>
          ) : (
            exchanges.map((exchange) => (
              <button
                key={exchange.id}
                type="button"
                onClick={() => setActiveId(exchange.id)}
                className={`inline-flex min-h-9 min-w-0 shrink-0 items-center gap-2 overflow-hidden break-words rounded-md border px-3 py-2 text-sm transition ${
                  selected?.id === exchange.id
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-50"
                    : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                }`}
              >
                <span className="font-mono text-xs">{exchange.method}</span>
                <span>{exchange.label}</span>
              </button>
            ))
          )}
        </div>

        <div className="flex min-h-min min-w-0 gap-2 overflow-hidden">
          <button
            type="button"
            onClick={() => setPane("request")}
            className={`min-h-9 min-w-0 flex-1 overflow-hidden break-words rounded-md border px-3 py-2 text-sm font-medium transition ${
              pane === "request"
                ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-50"
                : "border-white/10 bg-white/[0.04] text-slate-300"
            }`}
          >
            Request
          </button>
          <button
            type="button"
            onClick={() => setPane("response")}
            className={`min-h-9 min-w-0 flex-1 overflow-hidden break-words rounded-md border px-3 py-2 text-sm font-medium transition ${
              pane === "response"
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-50"
                : "border-white/10 bg-white/[0.04] text-slate-300"
            }`}
          >
            Response
          </button>
        </div>

        <div className="min-h-min min-w-0 overflow-hidden rounded-lg border border-white/10 bg-black/20">
          <div className="flex min-h-min min-w-0 flex-wrap items-center gap-2 overflow-hidden border-b border-white/10 px-4 py-3 text-xs text-slate-300">
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 uppercase">
              {selected?.status ?? metrics.runStatus}
            </span>
            <span className="min-w-0 overflow-hidden break-all font-mono">
              {selected?.url ?? "Run a case"}
            </span>
          </div>
          <pre className="max-h-[420px] max-w-full overflow-auto p-4 text-xs leading-5 text-slate-300">
            {renderJson(payload)}
          </pre>
        </div>
      </div>
    </section>
  );
}

function evidenceItems(
  evidence: EvidenceResult | undefined,
  requirements: PayerRequirements | undefined,
) {
  if (evidence && evidence.matched.length + evidence.missing.length > 0) {
    return [
      ...evidence.matched.map((item) => ({
        id: item.requirementId,
        label: item.label,
        status: "matched" as const,
        source: item.source,
      })),
      ...evidence.missing.map((item) => ({
        id: item.requirementId,
        label: item.label,
        status: "missing" as const,
        source: item.source,
      })),
    ];
  }

  return (requirements ?? fallbackRequirements).requiredEvidence.map(
    (item) => ({
      id: item.id,
      label: item.label,
      status: "waiting" as const,
      source: undefined,
    }),
  );
}

export function EvidenceChecklist({
  result,
  events = [],
  loading = null,
  className = "",
}: EvidenceChecklistProps) {
  const metrics = deriveMetrics(result, events, loading);
  const items = evidenceItems(metrics.evidence, metrics.requirements);

  return (
    <section className={`${panelClass} ${className}`}>
      <PanelHeader
        icon={ClipboardCheck}
        title="Evidence"
        metric={`${metrics.matchedEvidenceCount}/${metrics.evidenceTotal}`}
        tone={metrics.missingEvidenceCount > 0 ? "amber" : "emerald"}
      />

      <div className="mt-4 grid min-h-min min-w-0 gap-3 overflow-hidden sm:grid-cols-2">
        <MetricTile
          label="Matched"
          value={integer(metrics.matchedEvidenceCount)}
          detail={`${percent(metrics.evidenceRate)} ready`}
          icon={CheckCircle2}
          tone="emerald"
        />
        <MetricTile
          label="Missing"
          value={integer(metrics.missingEvidenceCount)}
          detail={
            metrics.evidence?.complete ? "Submit allowed" : "Guardrail on"
          }
          icon={AlertTriangle}
          tone={metrics.missingEvidenceCount > 0 ? "amber" : "slate"}
        />
      </div>

      <div className="mt-4 grid max-h-[420px] min-h-min min-w-0 gap-3 overflow-auto pr-1">
        {items.map((item) => {
          const tone =
            item.status === "matched"
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-50"
              : item.status === "missing"
                ? "border-amber-400/25 bg-amber-400/10 text-amber-50"
                : "border-white/10 bg-white/[0.035] text-slate-300";

          return (
            <article
              key={item.id}
              className={`min-h-min min-w-0 overflow-hidden break-words rounded-lg border p-3 ${tone}`}
            >
              <div className="flex min-w-0 items-start justify-between gap-3 overflow-hidden">
                <div className="min-w-0 overflow-hidden">
                  <p className="min-w-0 overflow-hidden break-words text-sm font-semibold">
                    {item.label}
                  </p>
                  <p className="mt-1 min-w-0 overflow-hidden break-all font-mono text-xs opacity-75">
                    {item.source ?? item.id}
                  </p>
                </div>
                <span className="shrink-0 rounded-md border border-white/10 bg-black/15 px-2 py-0.5 text-xs uppercase">
                  {item.status}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function OutcomePanel({
  result,
  events = [],
  loading = null,
  className = "",
}: OutcomePanelProps) {
  const metrics = deriveMetrics(result, events, loading);
  const tone = runStatusTone[metrics.runStatus];
  const submitted = metrics.runStatus === "submitted";
  const blocked = metrics.runStatus === "blocked";
  const decisionLabel =
    metrics.submission.decision === "pending_payer_review"
      ? "Payer review"
      : (metrics.submission.decision ?? "Payer review");

  return (
    <section className={`${panelClass} ${className}`}>
      <PanelHeader
        icon={submitted ? CheckCircle2 : blocked ? AlertTriangle : Gauge}
        title="Outcome"
        metric={statusLabel(metrics.runStatus)}
        tone={tone}
      />

      <div className={`mt-4 ${tileClass} ${toneClasses[tone]}`}>
        <p className="text-xs font-medium uppercase text-slate-300">Result</p>
        <p className="mt-3 min-w-0 overflow-hidden break-words text-3xl font-semibold leading-tight text-white">
          {submitted
            ? decisionLabel
            : blocked
              ? "Draft saved"
              : statusLabel(metrics.runStatus)}
        </p>
        <p className="mt-2 min-w-0 overflow-hidden break-words text-xs leading-5 text-slate-300">
          {statusDetail(metrics)}
        </p>
      </div>

      <div className="mt-3 grid min-h-min min-w-0 gap-3 overflow-hidden sm:grid-cols-2">
        <MetricTile
          label="Savings"
          value={money(metrics.roi.transactionCostSavingsUsd)}
          detail={`${money(metrics.roi.netSavingsAfterPlatformFeeUsd)} net`}
          icon={Gauge}
          tone="cyan"
        />
        <MetricTile
          label="Time"
          value={`${metrics.roi.minutesSavedBaseline} min`}
          detail={`${metrics.roi.bestCaseTimeSavedMinutes} min best`}
          icon={Timer}
          tone="emerald"
        />
      </div>

      <div className="mt-3 grid min-h-min min-w-0 gap-3 overflow-hidden">
        <div className={softTileClass}>
          <p className="text-xs font-medium uppercase text-slate-400">
            Prior-auth ID
          </p>
          <p className="mt-1 min-w-0 overflow-hidden break-all font-mono text-sm font-semibold text-white">
            {metrics.submission.priorAuthId ?? "Not submitted"}
          </p>
        </div>
        {metrics.submission.missingEvidence?.length ? (
          <div className={`${tileClass} border-amber-400/25 bg-amber-400/10`}>
            <p className="text-xs font-medium uppercase text-amber-100">
              Missing
            </p>
            <p className="mt-2 min-w-0 overflow-hidden break-words text-sm font-semibold text-white">
              {metrics.submission.missingEvidence.join(", ")}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function AuditPacketDocument({
  result,
  events = [],
  loading = null,
  className = "",
}: AuditPacketDocumentProps) {
  const metrics = deriveMetrics(result, events, loading);
  const packet = useMemo(
    () => buildAuditPacket(events, result),
    [events, result],
  );
  const canExport = events.length > 0 || Boolean(metrics.audit.auditId);

  async function copyPacket() {
    await navigator.clipboard.writeText(renderJson(packet));
  }

  function downloadPacket() {
    const blob = new Blob([renderJson(packet)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${metrics.audit.auditId ?? "priorauth-audit-packet"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className={`${panelClass} ${className}`}>
      <div className="flex min-h-min min-w-0 flex-col gap-3 overflow-hidden sm:flex-row sm:items-center sm:justify-between">
        <PanelHeader
          icon={FileClock}
          title="Prior Authorization Audit Packet"
          metric={`${metrics.auditHashCount}/2 hashes`}
          tone={metrics.auditHashCount === 2 ? "emerald" : "slate"}
        />
        <div className="flex min-h-min min-w-0 flex-wrap gap-2 overflow-hidden">
          <button
            type="button"
            disabled={!canExport}
            onClick={() => {
              void copyPacket();
            }}
            className="inline-flex min-h-9 min-w-0 items-center justify-center gap-2 overflow-hidden break-words rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Copy className="h-4 w-4 shrink-0" />
            Copy
          </button>
          <button
            type="button"
            disabled={!canExport}
            onClick={downloadPacket}
            className="inline-flex min-h-9 min-w-0 items-center justify-center gap-2 overflow-hidden break-words rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4 shrink-0" />
            JSON
          </button>
        </div>
      </div>

      <div className="mt-4 grid min-h-min min-w-0 gap-3 overflow-hidden md:grid-cols-3">
        <MetricTile
          label="Events"
          value={integer(metrics.eventCount)}
          icon={Waypoints}
          tone="cyan"
        />
        <MetricTile
          label="Evidence hash"
          value={metrics.audit.evidenceHash ? "Yes" : "No"}
          icon={ShieldCheck}
          tone={metrics.audit.evidenceHash ? "emerald" : "slate"}
        />
        <MetricTile
          label="ROI hash"
          value={metrics.audit.roiHash ? "Yes" : "No"}
          icon={Gauge}
          tone={metrics.audit.roiHash ? "emerald" : "slate"}
        />
      </div>

      <div className="mt-4 grid min-h-min min-w-0 gap-3 overflow-hidden lg:grid-cols-2">
        <div className={softTileClass}>
          <p className="text-xs font-medium uppercase text-slate-400">
            Audit ID
          </p>
          <p className="mt-2 min-w-0 overflow-hidden break-all font-mono text-xs leading-5 text-slate-200">
            {metrics.audit.auditId ?? "No audit event yet"}
          </p>
        </div>
        <div className={softTileClass}>
          <p className="text-xs font-medium uppercase text-slate-400">
            Created
          </p>
          <p className="mt-2 min-w-0 overflow-hidden break-words text-sm font-semibold text-white">
            {metrics.audit.createdAt
              ? new Date(metrics.audit.createdAt).toLocaleString()
              : "Waiting"}
          </p>
        </div>
      </div>

      <pre className="mt-4 max-h-[420px] max-w-full overflow-auto rounded-lg border border-white/10 bg-black/20 p-4 text-xs leading-5 text-slate-300">
        {renderJson(packet)}
      </pre>
    </section>
  );
}

export function ProofOfWorkPanel({
  result,
  events = [],
  loading = null,
  className = "",
}: ProofOfWorkPanelProps) {
  const metrics = deriveMetrics(result, events, loading);
  const proofRows = asProofRows(result?.proofRows);
  const latestEvents = events.slice(-10);

  return (
    <section className={`${panelClass} ${className}`}>
      <PanelHeader
        icon={ShieldCheck}
        title="Proof of work"
        metric={statusLabel(metrics.runStatus)}
        tone={runStatusTone[metrics.runStatus]}
      />

      <div className="mt-4 grid min-h-min min-w-0 gap-3 overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="Events"
          value={integer(metrics.eventCount)}
          detail={duration(metrics.durationMs)}
          icon={Waypoints}
          tone="cyan"
        />
        <MetricTile
          label="Tools"
          value={`${metrics.passedToolCount}/${metrics.toolCount}`}
          detail={`${metrics.blockedToolCount} blocked`}
          icon={Wrench}
          tone={metrics.blockedToolCount > 0 ? "amber" : "emerald"}
        />
        <MetricTile
          label="APIs"
          value={integer(metrics.apiCount)}
          detail={`${metrics.ehrApiCount} EHR / ${metrics.payerApiCount} payer`}
          icon={DatabaseZap}
          tone="cyan"
        />
        <MetricTile
          label="Hashes"
          value={`${metrics.auditHashCount}/2`}
          detail={metrics.audit.status ?? "pending"}
          icon={ShieldCheck}
          tone={metrics.auditHashCount === 2 ? "emerald" : "slate"}
        />
      </div>

      <div className="mt-4 grid min-h-min min-w-0 gap-2 overflow-hidden">
        {proofRows.length === 0 ? (
          <div className="min-h-min min-w-0 overflow-hidden break-words rounded-lg border border-dashed border-white/15 p-5 text-sm text-slate-400">
            HTTP proof rows start on run.
          </div>
        ) : (
          proofRows.map((row) => (
            <div
              key={row.id}
              className="grid min-h-min min-w-0 gap-2 overflow-hidden break-words rounded-lg border border-white/10 bg-white/[0.035] p-3 sm:grid-cols-[72px_minmax(0,1fr)_84px_76px_88px]"
            >
              <span className="min-w-0 overflow-hidden break-words font-mono text-xs font-medium uppercase text-cyan-100">
                {row.method}
              </span>
              <span className="min-w-0 overflow-hidden break-all font-mono text-xs text-slate-200">
                {row.path}
              </span>
              <span className="min-w-0 overflow-hidden break-words text-xs uppercase text-slate-300 sm:text-right">
                {row.status}
              </span>
              <span className="min-w-0 overflow-hidden break-words text-xs text-slate-300 sm:text-right">
                {row.latencyMs}ms
              </span>
              <span className="min-w-0 overflow-hidden break-all font-mono text-xs text-slate-400 sm:text-right">
                {row.hash ?? row.source}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 grid min-h-min min-w-0 gap-2 overflow-hidden">
        {latestEvents.map((event) => (
          <div
            key={event.id}
            className="grid min-h-min min-w-0 gap-2 overflow-hidden break-words rounded-lg border border-white/10 bg-white/[0.025] p-3 sm:grid-cols-[120px_minmax(0,1fr)_90px]"
          >
            <span className="min-w-0 overflow-hidden break-words text-xs font-medium uppercase text-slate-400">
              {phaseLabels[event.phase]}
            </span>
            <span className="min-w-0 overflow-hidden break-words text-sm text-slate-200">
              {event.label}
            </span>
            <span className="min-w-0 overflow-hidden break-words text-xs uppercase text-slate-400 sm:text-right">
              {event.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

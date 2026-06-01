"use client";

import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

type Scenario = "complete" | "incomplete";

type Props = {
  onRun: (scenario: Scenario) => void;
  loading: Scenario | null;
};

const rows = [
  {
    caseId: "PA-001",
    patient: "Maya Patel",
    service: "CPT 93306 Echocardiography",
    payer: "Demo Health Plan",
    evidence: "Complete",
    status: "Ready",
    scenario: "complete" as const,
    icon: CheckCircle2
  },
  {
    caseId: "PA-002",
    patient: "Maya Patel",
    service: "CPT 93306 Echocardiography",
    payer: "Demo Health Plan",
    evidence: "Missing docs",
    status: "Needs review",
    scenario: "incomplete" as const,
    icon: AlertTriangle
  },
  {
    caseId: "PA-003",
    patient: "Bulk export attempt",
    service: "Unknown",
    payer: "Unknown",
    evidence: "Unsafe",
    status: "Blocked",
    scenario: null,
    icon: ShieldAlert
  }
];

export function PriorAuthInboxPanel({ onRun, loading }: Props) {
  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-slate-300">
            Operator workspace
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-white">
            Prior Authorization Inbox
          </h2>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300">
          2 actionable demo cases
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {rows.map((row) => {
          const Icon = row.icon;
          const disabled = !row.scenario || loading !== null;

          return (
            <div
              key={row.caseId}
              className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4 lg:grid-cols-[90px_1fr_1fr_1fr_110px_130px_150px]"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Icon className="h-4 w-4 text-cyan-300" />
                {row.caseId}
              </div>
              <p className="text-sm text-slate-200">{row.patient}</p>
              <p className="text-sm text-slate-300">{row.service}</p>
              <p className="text-sm text-slate-300">{row.payer}</p>
              <p className="text-sm text-slate-300">{row.evidence}</p>
              <p className="text-sm text-slate-300">{row.status}</p>
              {row.scenario ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRun(row.scenario)}
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {row.scenario === "complete" ? "Run ePA" : "Check evidence"}
                </button>
              ) : (
                <span className="inline-flex min-h-10 items-center justify-center rounded-md border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                  View audit
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

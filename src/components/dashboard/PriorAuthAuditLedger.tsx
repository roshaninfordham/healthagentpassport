"use client";

import { Copy, Download, FileClock, ShieldCheck } from "lucide-react";
import type { PriorAuthRunEvent, PriorAuthRunResult } from "@/lib/live-events";

type Props = {
  events: PriorAuthRunEvent[];
  result: PriorAuthRunResult;
};

export function PriorAuthAuditLedger({ events, result }: Props) {
  const audit = result.audit as
    | {
        auditId?: string;
        status?: string;
        evidenceHash?: string;
        roiHash?: string;
        createdAt?: string;
      }
    | undefined;
  const auditPacket = {
    audit,
    runId: events[0]?.runId,
    caseId: events[0]?.caseId,
    agentId: "trusted-priorauth-agent",
    payerDecision:
      (result.submission as { decision?: string } | undefined)?.decision ??
      "not_submitted",
    medicalDecisionMade: false,
    syntheticOnly: true,
    events: events.map((event) => ({
      phase: event.phase,
      status: event.status,
      label: event.label,
      timestamp: event.timestamp
    })),
    roi: result.roi,
    evidence: result.evidence,
    submission: result.submission
  };

  async function copyAuditJson() {
    await navigator.clipboard.writeText(JSON.stringify(auditPacket, null, 2));
  }

  function downloadAuditPacket() {
    const blob = new Blob([JSON.stringify(auditPacket, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${audit?.auditId ?? "priorauth-audit"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <FileClock className="h-5 w-5 text-amber-300" />
          Audit evidence
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyAuditJson}
            disabled={!audit}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Copy className="h-4 w-4" />
            Copy audit JSON
          </button>
          <button
            type="button"
            onClick={downloadAuditPacket}
            disabled={!audit}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Download audit packet
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase text-slate-400">Audit status</p>
          <p className="mt-2 text-sm font-semibold text-white">
            {audit?.status ?? "Waiting for run"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase text-slate-400">Event count</p>
          <p className="mt-2 text-sm font-semibold text-white">
            {events.length} streamed events
          </p>
        </div>
        <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4">
          <div className="flex items-center gap-2 text-xs uppercase text-emerald-100">
            <ShieldCheck className="h-4 w-4" />
            Safety
          </div>
          <p className="mt-2 text-sm font-semibold text-white">
            Synthetic data only
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm">
        <div className="rounded-md border border-white/10 bg-black/15 p-3">
          <p className="text-slate-400">Evidence hash</p>
          <p className="mt-1 break-all font-mono text-xs text-slate-200">
            {audit?.evidenceHash ?? "No evidence hash yet"}
          </p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/15 p-3">
          <p className="text-slate-400">ROI hash</p>
          <p className="mt-1 break-all font-mono text-xs text-slate-200">
            {audit?.roiHash ?? "No ROI hash yet"}
          </p>
        </div>
      </div>
    </section>
  );
}

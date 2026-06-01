"use client";

import { FileClock, ShieldCheck } from "lucide-react";
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

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <FileClock className="h-5 w-5 text-amber-300" />
        Audit evidence
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

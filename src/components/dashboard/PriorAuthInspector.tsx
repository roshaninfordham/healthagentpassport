"use client";

import { Braces, PackageCheck } from "lucide-react";
import type { PriorAuthRunResult } from "@/lib/live-events";

type Props = {
  result: PriorAuthRunResult;
};

function renderJson(value: unknown) {
  if (!value) return "{}";
  return JSON.stringify(value, null, 2);
}

export function PriorAuthInspector({ result }: Props) {
  const submission = result.submission as
    | { priorAuthId?: string; decision?: string; status?: string }
    | undefined;

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <PackageCheck className="h-5 w-5 text-emerald-300" />
        Submission inspector
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs uppercase text-slate-400">Prior-auth ID</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">
            {submission?.priorAuthId ?? "Not submitted"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs uppercase text-slate-400">Status</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {submission?.status ?? "Draft"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs uppercase text-slate-400">Decision</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {submission?.decision ?? "No payer submission"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-black/20">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-sm font-semibold text-slate-100">
          <Braces className="h-4 w-4 text-cyan-300" />
          Latest package / submission JSON
        </div>
        <pre className="max-h-80 overflow-auto p-4 text-xs leading-5 text-slate-300">
          {renderJson(result.authPackage ?? result.submission ?? result.evidence)}
        </pre>
      </div>
    </section>
  );
}

"use client";

import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";

type Props = {
  loading: "complete" | "incomplete" | null;
  resetting: boolean;
  onRun: (scenario: "complete" | "incomplete") => void;
  onReset: () => void;
};

export function PriorAuthRunControls({
  loading,
  resetting,
  onRun,
  onReset
}: Props) {
  return (
    <section className="glass-panel rounded-lg p-5">
      <p className="text-xs font-medium uppercase text-slate-300">
        Demo controls
      </p>
      <h2 className="mt-1 text-xl font-semibold text-white">
        Prior-auth workflow
      </h2>

      <div className="mt-5 grid gap-3">
        <button
          type="button"
          onClick={() => onRun("complete")}
          disabled={loading !== null || resetting}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          {loading === "complete" ? "Starting live demo" : "Start live demo"}
        </button>
        <button
          type="button"
          onClick={() => onRun("incomplete")}
          disabled={loading !== null || resetting}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <AlertTriangle className="h-4 w-4" />
          {loading === "incomplete" ? "Checking gaps" : "Check gaps"}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={loading !== null || resetting}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          {resetting ? "Resetting demo" : "Reset demo"}
        </button>
      </div>

      <div className="mt-5 border-t border-white/10 pt-4 text-sm leading-6 text-slate-300">
        <p>1. Discover payer requirements electronically.</p>
        <p>2. Gather synthetic EHR evidence through real APIs.</p>
        <p>3. Submit only when documentation is complete.</p>
      </div>
    </section>
  );
}

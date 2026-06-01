"use client";

import { Ban, RotateCcw, ShieldCheck } from "lucide-react";

type Props = {
  loading: "trusted" | "sketchy" | null;
  resetting: boolean;
  onRun: (scenario: "trusted" | "sketchy") => void;
  onReset: () => void;
};

export function DemoControls({ loading, resetting, onRun, onReset }: Props) {
  return (
    <section className="glass-panel rounded-lg p-5">
      <p className="text-xs font-medium uppercase text-slate-300">
        Demo controls
      </p>
      <h2 className="mt-1 text-xl font-semibold text-white">
        Agent Access Attempts
      </h2>

      <div className="mt-5 grid gap-3">
        <button
          type="button"
          onClick={() => onRun("trusted")}
          disabled={loading !== null || resetting}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldCheck className="h-4 w-4" />
          {loading === "trusted" ? "Running TrustedCareAgent" : "Run TrustedCareAgent"}
        </button>
        <button
          type="button"
          onClick={() => onRun("sketchy")}
          disabled={loading !== null || resetting}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-50 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Ban className="h-4 w-4" />
          {loading === "sketchy" ? "Running SketchyScraperAgent" : "Run SketchyScraperAgent"}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={loading !== null || resetting}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          {resetting ? "Resetting demo" : "Reset demo data"}
        </button>
      </div>

      <div className="mt-5 border-t border-white/10 pt-4 text-sm leading-6 text-slate-300">
        <p>1. Healthcare APIs need a control plane for autonomous agents.</p>
        <p>2. TrustedCareAgent passes identity, consent, and behavior checks.</p>
        <p>3. SketchyScraperAgent is blocked before the protected API is called.</p>
      </div>
    </section>
  );
}

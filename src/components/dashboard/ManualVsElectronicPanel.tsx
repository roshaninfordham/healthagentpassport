"use client";

import { ArrowRight, FileWarning, Send } from "lucide-react";

const manualSteps = [
  "Check payer portal",
  "Read requirement notes",
  "Search chart manually",
  "Attach documents",
  "Submit with weak audit"
];

const electronicSteps = [
  "Fetch requirements",
  "Read EHR evidence APIs",
  "Match documents",
  "Submit structured package",
  "Write audit evidence"
];

export function ManualVsElectronicPanel() {
  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-slate-300">
            Workflow comparison
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-white">
            Manual work beside electronic prior auth
          </h2>
        </div>
        <div className="rounded-md border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100">
          $5.18 transaction delta per authorization
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-100">
            <FileWarning className="h-4 w-4" />
            Manual prior auth
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-400">Provider cost</p>
              <p className="text-2xl font-semibold text-white">$10.97</p>
            </div>
            <div>
              <p className="text-slate-400">Staff time</p>
              <p className="text-2xl font-semibold text-white">16 min</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {manualSteps.map((step) => (
              <div
                key={step}
                className="rounded-md border border-white/10 bg-black/15 px-3 py-2 text-sm text-slate-200"
              >
                {step}
              </div>
            ))}
          </div>
        </div>

        <div className="hidden items-center justify-center text-slate-400 lg:flex">
          <ArrowRight className="h-6 w-6" />
        </div>

        <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
            <Send className="h-4 w-4" />
            PriorAuth Passport
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-400">Provider cost</p>
              <p className="text-2xl font-semibold text-white">$5.79</p>
            </div>
            <div>
              <p className="text-slate-400">Staff time</p>
              <p className="text-2xl font-semibold text-white">9 min</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {electronicSteps.map((step) => (
              <div
                key={step}
                className="rounded-md border border-white/10 bg-black/15 px-3 py-2 text-sm text-slate-200"
              >
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

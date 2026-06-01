"use client";

import { CircleDollarSign } from "lucide-react";

const benchmarks = [
  { label: "Annual savings opportunity", value: "$515M" },
  { label: "Manual provider cost", value: "$10.97" },
  { label: "Electronic provider cost", value: "$5.79" },
  { label: "Baseline time saved", value: "7 min" },
  { label: "Best-case staff time saved", value: "14 min" },
  { label: "Auths / physician / week", value: "39" }
];

export function MarketBenchmarksPanel() {
  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <CircleDollarSign className="h-5 w-5 text-emerald-300" />
        Market pain and ROI assumptions
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {benchmarks.map((benchmark) => (
          <div
            key={benchmark.label}
            className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
          >
            <p className="text-2xl font-semibold text-white">
              {benchmark.value}
            </p>
            <p className="mt-2 text-sm text-slate-300">{benchmark.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-400">
        These configurable demo assumptions keep transaction-cost savings and
        labor-time savings separate to avoid double counting.
      </p>
    </section>
  );
}

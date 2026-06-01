"use client";

import { Settings, ShieldCheck } from "lucide-react";

const roi = [
  "Manual provider cost: $10.97",
  "Electronic provider cost: $5.79",
  "Manual time: 16 min",
  "Electronic time: 9 min",
  "Best-case time saved: 14 min",
  "Staff hourly rate: $35/hr"
];

const rules = [
  "Referral note",
  "Recent relevant observation",
  "Medication list",
  "Diagnosis list"
];

const safety = [
  "Synthetic data only",
  "No real PHI",
  "No diagnosis",
  "No treatment recommendation",
  "No medical necessity decision",
  "No real payer submission"
];

export function SettingsPanel() {
  return (
    <section className="grid gap-5 lg:grid-cols-3">
      <div className="glass-panel rounded-lg p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Settings className="h-5 w-5 text-cyan-300" />
          ROI assumptions
        </div>
        <div className="mt-4 grid gap-2">
          {roi.map((item) => (
            <div
              key={item}
              className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-lg p-5">
        <p className="text-sm font-semibold text-white">Payer rules</p>
        <p className="mt-2 text-sm text-slate-400">
          Demo Health Plan / CPT 93306 requires:
        </p>
        <div className="mt-4 grid gap-2">
          {rules.map((item) => (
            <div
              key={item}
              className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-lg p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <ShieldCheck className="h-5 w-5 text-emerald-300" />
          Safety boundaries
        </div>
        <div className="mt-4 grid gap-2">
          {safety.map((item) => (
            <div
              key={item}
              className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-50/90"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { Building2, Code2, LineChart, TimerReset } from "lucide-react";

const users = [
  {
    icon: Building2,
    title: "Practice operations manager",
    body: "Sees which prior-auth requests are ready, which are blocked by missing documents, and what each electronic submission saves."
  },
  {
    icon: Code2,
    title: "Health API developer",
    body: "Uses the SDK, config files, sample EHR API, and sample payer API to wire electronic prior auth into a product demo."
  }
];

const pain = [
  "Manual payer portal checks",
  "Phone and fax follow-up loops",
  "Unclear documentation requirements",
  "Hard-to-prove administrative ROI"
];

export function MarketPainPanel() {
  return (
    <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="glass-panel rounded-lg p-5">
        <p className="text-xs font-medium uppercase text-slate-300">
          Product focus
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-white">
          Real-time electronic prior authorization infrastructure
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          PriorAuth Passport automates intake, payer requirement discovery,
          evidence gathering, package submission, ROI calculation, and audit
          proof for administrative prior-auth workflows. It does not make
          treatment decisions or provide medical advice.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {users.map((user) => {
            const Icon = user.icon;
            return (
              <div
                key={user.title}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
              >
                <Icon className="h-5 w-5 text-cyan-300" />
                <h3 className="mt-3 text-sm font-semibold text-white">
                  {user.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {user.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-panel rounded-lg p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <TimerReset className="h-5 w-5 text-amber-300" />
          Why this workflow exists
        </div>
        <div className="mt-4 grid gap-2">
          {pain.map((item) => (
            <div
              key={item}
              className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-200"
            >
              {item}
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
            <LineChart className="h-4 w-4" />
            Demo promise
          </div>
          <p className="mt-2 text-sm leading-6 text-emerald-50/85">
            Click one button and watch live API calls produce a payer-ready
            package, missing-evidence guardrail, ROI proof, and immutable audit
            hashes from synthetic data.
          </p>
        </div>
      </div>
    </section>
  );
}

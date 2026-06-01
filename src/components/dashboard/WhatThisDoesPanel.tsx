"use client";

import { FileSearch, FolderInput, SendHorizonal } from "lucide-react";

const steps = [
  {
    icon: FileSearch,
    title: "Discover payer requirements",
    body: "Ask the payer API what documentation is required for CPT 93306 before any package is submitted."
  },
  {
    icon: FolderInput,
    title: "Gather EHR evidence",
    body: "Fetch synthetic patient, diagnosis, medication, observation, and document resources through live HTTP calls."
  },
  {
    icon: SendHorizonal,
    title: "Submit and prove ROI",
    body: "Submit only complete packages, calculate transaction/time savings, and write audit evidence."
  }
];

export function WhatThisDoesPanel() {
  return (
    <section className="glass-panel rounded-lg p-5">
      <p className="text-xs font-medium uppercase text-slate-300">
        What this does
      </p>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <div
              key={step.title}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md border border-cyan-400/25 bg-cyan-400/10 text-sm font-semibold text-cyan-100">
                  {index + 1}
                </span>
                <Icon className="h-5 w-5 text-cyan-300" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {step.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

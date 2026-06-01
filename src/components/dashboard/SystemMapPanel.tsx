"use client";

import { ArrowRight, Bot, FileCheck2, ReceiptText, ServerCog } from "lucide-react";

const nodes = [
  {
    icon: Bot,
    title: "TrustedPriorAuthAgent",
    body: "Administrative identity and allowed scopes"
  },
  {
    icon: ServerCog,
    title: "Workflow engine",
    body: "Runs case steps and streams every event"
  },
  {
    icon: FileCheck2,
    title: "Evidence matcher",
    body: "Compares payer requirements with EHR resources"
  },
  {
    icon: ReceiptText,
    title: "ROI + audit ledger",
    body: "Calculates savings and writes proof hashes"
  }
];

export function SystemMapPanel() {
  return (
    <section className="glass-panel rounded-lg p-5">
      <p className="text-xs font-medium uppercase text-slate-300">
        Live system map
      </p>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
        {nodes.map((node, index) => {
          const Icon = node.icon;

          return (
            <div key={node.title} className="contents">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <Icon className="h-5 w-5 text-cyan-300" />
                <h3 className="mt-3 text-sm font-semibold text-white">
                  {node.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {node.body}
                </p>
              </div>
              {index < nodes.length - 1 ? (
                <div className="hidden items-center justify-center text-slate-500 lg:flex">
                  <ArrowRight className="h-5 w-5" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

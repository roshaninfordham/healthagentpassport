"use client";

import { motion } from "framer-motion";
import { Activity, Calculator, FileCheck2, ShieldCheck } from "lucide-react";

const badges = [
  "Synthetic data only",
  "No medical advice",
  "No treatment decisions",
  "CAQH ROI model",
  "CMS 2027 API-ready",
  "Agent identity protected"
];

export function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="glass-panel rounded-lg px-5 py-5 sm:px-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          <div className="mb-4 flex flex-wrap gap-2 text-xs font-medium uppercase text-slate-300">
            <span className="inline-flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-100">
              <ShieldCheck className="h-3.5 w-3.5" />
              Administrative ePA workflow
            </span>
            <span className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-cyan-100">
              ROI per transaction
            </span>
            <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-amber-100">
              Audit-ready evidence
            </span>
          </div>
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
            PriorAuth Passport
          </h1>
          <p className="mt-2 text-xl font-medium text-cyan-100">
            Electronic prior authorization ROI agent
          </p>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
            Turn manual prior authorization into a real-time electronic workflow
            with requirement discovery, document assembly, agent identity, payer
            submission, ROI proof, and audit evidence.
          </p>
        </div>

        <div className="grid min-w-[260px] gap-2 text-sm text-slate-300">
          <div className="flex items-center gap-2 text-slate-100">
            <Activity className="h-4 w-4 text-emerald-300" />
            EHR + payer APIs live
          </div>
          <div className="flex items-center gap-2 text-slate-100">
            <Calculator className="h-4 w-4 text-cyan-300" />
            $5.18 transaction delta
          </div>
          <div className="flex items-center gap-2 text-slate-100">
            <FileCheck2 className="h-4 w-4 text-amber-300" />
            Missing evidence guardrail
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {badges.map((badge) => (
          <span
            key={badge}
            className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300"
          >
            {badge}
          </span>
        ))}
      </div>
    </motion.section>
  );
}

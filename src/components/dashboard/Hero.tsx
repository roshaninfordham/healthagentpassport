"use client";

import { motion } from "framer-motion";
import { Activity, Database, ShieldCheck, Sparkles } from "lucide-react";

const statusPills = [
  "CLI gateway",
  "TypeScript SDK",
  "Sample FHIR API",
  "Live event stream",
  "Synthetic data only"
];

export function Hero() {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="glass-panel rounded-lg px-5 py-5 sm:px-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          <div className="mb-4 flex flex-wrap gap-2 text-xs font-medium uppercase text-slate-300">
            <span className="inline-flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-100">
              <ShieldCheck className="h-3.5 w-3.5" />
              Installable gateway for healthcare APIs
            </span>
            <span className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-cyan-100">
              No PHI
            </span>
            <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-amber-100">
              No medical advice
            </span>
          </div>
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
            HealthAgent Passport
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
            Installable agent firewall for FHIR, payer, pharmacy, and
            prior-auth APIs. Agents call the gateway, not the API; only
            approved requests reach upstream.
          </p>
        </div>

        <div className="grid min-w-[260px] gap-2 text-sm text-slate-300">
          <div className="flex items-center gap-2 text-slate-100">
            <Activity className="h-4 w-4 text-emerald-300" />
            Gateway mode: enforce
          </div>
          <div className="flex items-center gap-2 text-slate-100">
            <Database className="h-4 w-4 text-cyan-300" />
            Protected upstream on :4001
          </div>
          <div className="flex items-center gap-2 text-slate-100">
            <Sparkles className="h-4 w-4 text-amber-300" />
            Studio control plane
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {statusPills.map((pill) => (
          <span
            key={pill}
            className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300"
          >
            {pill}
          </span>
        ))}
      </div>
    </motion.header>
  );
}

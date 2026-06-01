"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Container,
  Cpu,
  Network,
  ShieldCheck,
  XCircle
} from "lucide-react";
import type { SandboxReportView } from "@/lib/client-types";
import { cn } from "@/lib/utils";

type Props = {
  sandboxReport?: SandboxReportView;
  loading: "trusted" | "sketchy" | null;
};

const profiles = [
  {
    id: "trusted-care-agent",
    name: "TrustedCareAgent",
    risk: "4/100",
    result: "eligible for prod route",
    signals: [
      "no bulk endpoint attempt",
      "no secret file access",
      "no outbound internet attempt",
      "no suspicious shell command"
    ]
  },
  {
    id: "sketchy-scraper-agent",
    name: "SketchyScraperAgent",
    risk: "100/100",
    result: "sandbox_only",
    signals: [
      "attempted /fhir/all?dump=true",
      "attempted environment secret read",
      "attempted outbound network call",
      "attempted filesystem traversal"
    ]
  }
];

function verdictTone(verdict?: string) {
  if (verdict === "clean") {
    return "border-emerald-400/40 bg-emerald-400/10 text-emerald-100";
  }
  if (verdict === "watch") {
    return "border-amber-400/40 bg-amber-400/10 text-amber-100";
  }
  if (verdict === "suspicious") {
    return "border-orange-400/40 bg-orange-400/10 text-orange-100";
  }
  return "border-rose-400/40 bg-rose-400/10 text-rose-100";
}

export function SandboxPanel({ sandboxReport, loading }: Props) {
  const activeId = sandboxReport?.agentId;

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase text-amber-200">
            Agent Behavioral Sandbox
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-white">
            Identity tells us who. Consent tells us what. Sandboxing tells us how.
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Suspicious agent tools can be evaluated in deterministic mock mode
            or, on Linux, an opt-in gVisor runsc container path with restricted
            network, read-only filesystem, CPU limits, memory limits, and pids
            limits.
          </p>
        </div>

        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold",
            sandboxReport
              ? verdictTone(sandboxReport.verdict)
              : "border-white/10 bg-white/[0.04] text-slate-200"
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          {sandboxReport
            ? `${sandboxReport.verdict.toUpperCase()} risk ${sandboxReport.riskScore}/100`
            : loading
              ? "RUNNING"
              : "READY"}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.map((profile) => {
            const active = activeId === profile.id;
            const blocked = profile.id.includes("sketchy");

            return (
              <motion.div
                key={profile.id}
                animate={{
                  borderColor: active
                    ? blocked
                      ? "rgba(251, 113, 133, 0.55)"
                      : "rgba(52, 211, 153, 0.55)"
                    : "rgba(255, 255, 255, 0.12)"
                }}
                className="rounded-md border bg-white/[0.025] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{profile.name}</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Risk score {active ? `${sandboxReport?.riskScore}/100` : profile.risk}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs font-medium",
                      blocked
                        ? "border-rose-400/35 bg-rose-400/10 text-rose-100"
                        : "border-emerald-400/35 bg-emerald-400/10 text-emerald-100"
                    )}
                  >
                    {blocked ? "block" : "clean"}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-300">
                  {profile.signals.map((signal) => (
                    <div key={signal} className="flex gap-2">
                      {blocked ? (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      )}
                      <span>{signal}</span>
                    </div>
                  ))}
                </div>

                <p className="mt-4 border-t border-white/10 pt-3 text-sm text-slate-200">
                  Result: {active ? sandboxReport?.routeImpact : profile.result}
                </p>
              </motion.div>
            );
          })}
        </div>

        <div className="rounded-md border border-white/10 bg-white/[0.025] p-4">
          <div className="grid gap-3 text-sm text-slate-300">
            <div className="flex items-center gap-2 text-slate-100">
              <Container className="h-4 w-4 text-cyan-300" />
              Runtime: {sandboxReport?.runtime ?? "mock or gVisor runsc"}
            </div>
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-emerald-300" />
              Network: none by default
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-amber-300" />
              CPU: 0.5, memory: 128m, filesystem: read-only
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-300">
            {["Agent tool code", "Container", "gVisor runsc", "Behavior report", "Trust route"].map(
              (step, index, steps) => (
                <span key={step} className="inline-flex items-center gap-2">
                  <span className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1">
                    {step}
                  </span>
                  {index < steps.length - 1 && (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                  )}
                </span>
              )
            )}
          </div>

          {sandboxReport && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="text-sm font-medium text-white">Observed signals</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-300">
                {sandboxReport.signals.map((signal) => (
                  <div key={signal} className="flex gap-2">
                    {sandboxReport.verdict === "block" ? (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    )}
                    <span>{signal}</span>
                  </div>
                ))}
              </div>
              {sandboxReport.error && (
                <p className="mt-3 rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                  {sandboxReport.error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

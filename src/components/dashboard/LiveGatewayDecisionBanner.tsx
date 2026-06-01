"use client";

import { BadgeCheck, CircleSlash, ShieldAlert } from "lucide-react";
import type { GatewayDecisionEvent } from "@/lib/live-events";
import { cn } from "@/lib/utils";

type Props = {
  decisions: GatewayDecisionEvent[];
  loading: "trusted" | "sketchy" | null;
};

export function LiveGatewayDecisionBanner({ decisions, loading }: Props) {
  const latest = decisions[decisions.length - 1];
  const anyAllowed = decisions.some((decision) => decision.allowed);
  const title = latest
    ? anyAllowed
      ? "ACCESS GRANTED"
      : "ACCESS DENIED"
    : loading
      ? "EVALUATING AGENT"
      : "READY FOR LIVE GATEWAY DEMO";
  const icon = latest ? (
    anyAllowed ? (
      <BadgeCheck className="h-5 w-5" />
    ) : (
      <ShieldAlert className="h-5 w-5" />
    )
  ) : (
    <CircleSlash className="h-5 w-5" />
  );

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold",
              latest
                ? anyAllowed
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                  : "border-rose-400/40 bg-rose-400/10 text-rose-100"
                : "border-white/10 bg-white/[0.04] text-slate-200"
            )}
          >
            {icon}
            {title}
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white">
            {latest?.agentId ?? "Agents call the gateway, not the API"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            {latest?.reason ??
              "Run a trusted or attack scenario to stream signed gateway traffic, policy checks, sandbox behavior, upstream proof, and audit evidence."}
          </p>
        </div>

        <div className="grid min-w-[240px] gap-2 text-sm">
          <Metric label="Trust" value={latest ? `${latest.trust.score}/100` : "pending"} />
          <Metric label="Route" value={latest?.trust.route ?? "pending"} />
          <Metric
            label="Upstream"
            value={latest?.upstream?.called ? "called" : latest ? "not called" : "waiting"}
          />
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-slate-100">{value}</span>
    </div>
  );
}

"use client";

import { useState } from "react";
import { FileJson } from "lucide-react";
import type { GatewayDecisionEvent } from "@/lib/live-events";
import { cn } from "@/lib/utils";

type Props = {
  decisions: GatewayDecisionEvent[];
};

const tabs = [
  "Incoming request",
  "Gateway decision",
  "Upstream response",
  "Audit evidence"
] as const;

function buildPayload(
  tab: (typeof tabs)[number],
  decision: GatewayDecisionEvent | undefined
) {
  if (!decision) {
    return { waiting: true };
  }

  if (tab === "Incoming request") {
    return {
      method: decision.method,
      path: decision.path,
      headers: {
        "x-agent-id": decision.agentId,
        "x-agent-signature": "verified by gateway",
        "x-hap-run-id": decision.runId
      }
    };
  }

  if (tab === "Upstream response") {
    return decision.upstream?.called
      ? decision.upstream
      : {
          blockedBeforeUpstream: true,
          reason: decision.reason
        };
  }

  if (tab === "Audit evidence") {
    return decision.audit;
  }

  return decision;
}

export function RequestDecisionInspector({ decisions }: Props) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Incoming request");
  const decision = decisions[decisions.length - 1];
  const payload = buildPayload(tab, decision);

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-amber-200">
            Request inspector
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Agent request, decision, response
          </h2>
        </div>
        <FileJson className="h-5 w-5 text-amber-200" />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium transition",
              tab === item
                ? "border-amber-400/35 bg-amber-400/10 text-amber-100"
                : "border-white/10 bg-white/[0.035] text-slate-300 hover:bg-white/[0.06]"
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <pre className="max-h-[360px] overflow-auto rounded-md border border-white/10 bg-black/30 p-4 font-mono text-xs leading-5 text-slate-200">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </section>
  );
}

"use client";

import { AlertTriangle, CheckCircle2, Circle, Loader2, ShieldX } from "lucide-react";
import type { RunEvent } from "@/lib/live-events";
import { cn } from "@/lib/utils";

type Props = {
  events: RunEvent[];
  expectedResponses: number;
};

function statusTone(status: RunEvent["status"]) {
  if (status === "passed") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-100";
  if (status === "blocked") return "border-rose-400/40 bg-rose-400/10 text-rose-100";
  if (status === "failed") return "border-orange-400/40 bg-orange-400/10 text-orange-100";
  if (status === "running") return "border-cyan-400/40 bg-cyan-400/10 text-cyan-100";
  return "border-white/10 bg-white/[0.035] text-slate-300";
}

function StatusIcon({ status }: { status: RunEvent["status"] }) {
  if (status === "passed") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "blocked") return <ShieldX className="h-4 w-4" />;
  if (status === "failed") return <AlertTriangle className="h-4 w-4" />;
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin" />;
  return <Circle className="h-4 w-4" />;
}

export function LiveRunTimeline({ events, expectedResponses }: Props) {
  const responseCount = events.filter((event) => event.phase === "return_response").length;

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-cyan-200">
            Live gateway flow
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Step-by-step request timeline
          </h2>
        </div>
        <span className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
          {responseCount}/{expectedResponses || 1} responses
        </span>
      </div>

      <div className="max-h-[520px] overflow-y-auto pr-1">
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="rounded-md border border-white/10 bg-white/[0.035] p-4 text-sm text-slate-400">
              Start the sample API and gateway, then run a trusted or attack
              agent to stream every internal decision here.
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className={cn(
                  "rounded-md border p-3 transition",
                  statusTone(event.status)
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <StatusIcon status={event.status} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold">{event.label}</p>
                      <span className="font-mono text-[11px] uppercase opacity-80">
                        {event.phase}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs opacity-80">
                      <span>{new Date(event.ts).toLocaleTimeString()}</span>
                      {event.durationMs ? <span>{event.durationMs} ms</span> : null}
                      <span>{event.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

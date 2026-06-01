"use client";

import {
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Clock3,
  Loader2
} from "lucide-react";
import type { PriorAuthRunEvent } from "@/lib/live-events";

type Props = {
  events: PriorAuthRunEvent[];
  loading: boolean;
};

function statusClasses(status: PriorAuthRunEvent["status"]) {
  if (status === "passed") return "border-emerald-400/30 bg-emerald-400/10";
  if (status === "failed" || status === "blocked") {
    return "border-amber-400/30 bg-amber-400/10";
  }
  if (status === "running") return "border-cyan-400/30 bg-cyan-400/10";
  return "border-white/10 bg-white/[0.04]";
}

function StatusIcon({ status }: { status: PriorAuthRunEvent["status"] }) {
  if (status === "passed") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
  }
  if (status === "failed" || status === "blocked") {
    return <AlertCircle className="h-4 w-4 text-amber-300" />;
  }
  if (status === "running") {
    return <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />;
  }
  if (status === "info") return <CircleDot className="h-4 w-4 text-cyan-200" />;
  return <Clock3 className="h-4 w-4 text-slate-400" />;
}

export function PriorAuthLiveTimeline({ events, loading }: Props) {
  const visibleEvents = events.slice(-18).reverse();

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-slate-300">
            Real-time execution
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Live prior-auth timeline
          </h2>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
          {loading ? "Streaming" : `${events.length} events`}
        </div>
      </div>

      <div className="mt-5 grid max-h-[560px] gap-3 overflow-auto pr-1">
        {visibleEvents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 p-6 text-sm text-slate-400">
            Run the complete or incomplete case to stream each EHR, payer, ROI,
            and audit step.
          </div>
        ) : (
          visibleEvents.map((event) => (
            <div
              key={event.id}
              className={`rounded-lg border p-3 ${statusClasses(event.status)}`}
            >
              <div className="flex items-start gap-3">
                <StatusIcon status={event.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-white">
                      {event.label}
                    </p>
                    <span className="rounded-md border border-white/10 bg-black/15 px-2 py-0.5 text-[11px] uppercase text-slate-300">
                      {event.phase}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(event.timestamp).toLocaleTimeString()}{" "}
                    {event.durationMs ? ` / ${event.durationMs} ms` : ""}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

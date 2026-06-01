"use client";

import { Wrench } from "lucide-react";
import type { PriorAuthRunResult } from "@/lib/live-events";

type Props = {
  result: PriorAuthRunResult;
};

function compactJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

export function PriorAuthToolCallsPanel({ result }: Props) {
  const toolCalls = [...(result.toolCalls ?? [])].reverse();

  return (
    <section className="glass-panel min-w-0 rounded-lg p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Wrench className="h-5 w-5 text-cyan-300" />
          Tool Calls
        </div>
        <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-300">
          {toolCalls.length} tools
        </span>
      </div>

      <div className="mt-4 grid max-h-[560px] gap-3 overflow-auto pr-1">
        {toolCalls.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 p-5 text-sm text-slate-400">
            Tool calls appear as the agent verifies identity, fetches evidence,
            discovers requirements, submits packages, calculates ROI, and writes
            audit evidence.
          </div>
        ) : (
          toolCalls.map((call) => (
            <div
              key={call.id}
              className="rounded-lg border border-white/10 bg-black/20"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <p className="text-sm font-semibold text-white">{call.name}</p>
                <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] uppercase text-slate-300">
                  {call.status}
                </span>
              </div>
              <pre className="max-h-52 max-w-full overflow-auto p-4 text-xs leading-5 text-slate-300">
                {compactJson({
                  input: call.input,
                  output: call.output
                })}
              </pre>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

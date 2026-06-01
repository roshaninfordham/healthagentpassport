"use client";

import { Clock, DatabaseZap } from "lucide-react";
import type { GatewayDecisionEvent } from "@/lib/live-events";
import { cn, routeTone, shortHash } from "@/lib/utils";

type Props = {
  decisions: GatewayDecisionEvent[];
};

export function LiveAuditEvidenceTable({ decisions }: Props) {
  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-amber-200">
            Live audit evidence
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Gateway decision ledger
          </h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-slate-300">
          <DatabaseZap className="h-4 w-4 text-amber-300" />
          {decisions.length} decisions
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-white/10">
        <table className="min-w-[980px] w-full border-collapse text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-3 font-medium">Request</th>
              <th className="px-3 py-3 font-medium">Agent</th>
              <th className="px-3 py-3 font-medium">Endpoint</th>
              <th className="px-3 py-3 font-medium">Route</th>
              <th className="px-3 py-3 font-medium">Upstream</th>
              <th className="px-3 py-3 font-medium">Audit hashes</th>
              <th className="px-3 py-3 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {decisions.map((decision) => (
              <tr key={decision.requestId} className="align-top text-slate-300">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    <span className="font-mono text-xs">
                      {shortHash(decision.requestId)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {decision.allowed ? "allow" : "deny"}
                  </div>
                </td>
                <td className="px-3 py-3 font-medium text-slate-100">
                  {decision.agentId}
                </td>
                <td className="px-3 py-3">
                  <span className="font-mono text-xs">
                    {decision.method} {decision.path}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs font-medium",
                      routeTone(decision.trust.route)
                    )}
                  >
                    {decision.trust.route}
                  </span>
                  <div className="mt-2 text-xs text-slate-500">
                    {decision.trust.score}/100 tier {decision.trust.tier}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="text-slate-100">
                    {decision.upstream?.called ? "called" : "not called"}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-500">
                    {decision.upstream?.status
                      ? `HTTP ${decision.upstream.status}`
                      : "blocked before upstream"}
                  </div>
                </td>
                <td className="px-3 py-3 font-mono text-xs text-slate-400">
                  <div>req {shortHash(decision.audit.requestHash)}</div>
                  <div>res {shortHash(decision.audit.responseHash)}</div>
                  <div>audit {shortHash(decision.audit.auditId)}</div>
                </td>
                <td className="px-3 py-3">
                  <p className="max-w-[280px] text-xs leading-5">
                    {decision.reason}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {decisions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            Live audit evidence appears after the gateway returns a decision.
          </div>
        ) : null}
      </div>
    </section>
  );
}

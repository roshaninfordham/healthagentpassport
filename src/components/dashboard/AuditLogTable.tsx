"use client";

import { useEffect, useState } from "react";
import { Clock, DatabaseZap } from "lucide-react";
import type { AuditEventView } from "@/lib/client-types";
import { cn, decisionTone, routeTone, shortHash } from "@/lib/utils";

function parseScopes(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function AuditLogTable({ refreshKey }: { refreshKey: number }) {
  const [events, setEvents] = useState<AuditEventView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    fetch("/api/audit")
      .then((response) => response.json())
      .then((json: { events: AuditEventView[] }) => {
        if (alive) setEvents(json.events ?? []);
      })
      .catch(() => {
        if (alive) setEvents([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [refreshKey]);

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-amber-200">
            Compliance audit ledger
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Gateway Decisions
          </h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-slate-300">
          <DatabaseZap className="h-4 w-4 text-amber-300" />
          {events.length} events
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-white/10">
        <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-3 font-medium">Time</th>
              <th className="px-3 py-3 font-medium">Agent</th>
              <th className="px-3 py-3 font-medium">Endpoint</th>
              <th className="px-3 py-3 font-medium">Decision</th>
              <th className="px-3 py-3 font-medium">Route</th>
              <th className="px-3 py-3 font-medium">Trust</th>
              <th className="px-3 py-3 font-medium">Scopes</th>
              <th className="px-3 py-3 font-medium">Sandbox</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {events.map((event) => {
              const requiredScopes = parseScopes(event.requiredScopesJson);

              return (
                <tr key={event.id} className="align-top text-slate-300">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      {new Date(event.createdAt).toLocaleTimeString()}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-slate-500">
                      {shortHash(event.requestHash)}
                    </div>
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-100">
                    {event.agentId ?? "unknown"}
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-xs">
                      {event.method} {event.path}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs font-medium",
                        decisionTone(event.decision)
                      )}
                    >
                      {event.decision}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs font-medium",
                        routeTone(event.route)
                      )}
                    >
                      {event.route}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-slate-100">{event.trustScore}/100</div>
                    <div className="text-xs text-slate-500">
                      tier {event.trustTier}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="max-w-[170px] text-xs leading-5 text-slate-400">
                      {requiredScopes.length > 0
                        ? requiredScopes.join(", ")
                        : "none"}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-xs text-slate-300">
                      {event.sandboxVerdict ?? "none"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {event.sandboxRiskScore === null
                        ? "no risk"
                        : `${event.sandboxRiskScore}/100`}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-slate-100">HTTP {event.httpStatus}</div>
                    <div className="text-xs text-slate-500">
                      {event.latencyMs} ms
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <p className="max-w-[260px] text-xs leading-5">
                      {event.reason}
                    </p>
                    {event.delegationHash && (
                      <p className="mt-1 font-mono text-[11px] text-slate-500">
                        consent {shortHash(event.delegationHash)}
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!loading && events.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            No audit events yet.
          </div>
        )}
        {loading && (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            Loading audit events.
          </div>
        )}
      </div>
    </section>
  );
}

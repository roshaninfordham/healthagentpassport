"use client";

import { useEffect, useState } from "react";
import { DatabaseZap, ShieldCheck } from "lucide-react";
import type { GatewayDecisionEvent } from "@/lib/live-events";

type UpstreamStats = {
  online: boolean;
  stats: {
    totalHits: number;
    patientReadHits: number;
    priorAuthHits: number;
    bulkDumpHits: number;
    lastHits: Array<{
      ts: string;
      method: string;
      path: string;
    }>;
  };
};

type Props = {
  decisions: GatewayDecisionEvent[];
  refreshKey: number;
};

export function UpstreamProofCard({ decisions, refreshKey }: Props) {
  const [data, setData] = useState<UpstreamStats | null>(null);
  const latestDecision = decisions[decisions.length - 1];

  useEffect(() => {
    let alive = true;

    async function loadStats() {
      const response = await fetch("/api/upstream/stats");
      const json = (await response.json()) as UpstreamStats;
      if (alive) setData(json);
    }

    void loadStats();
    const interval = window.setInterval(loadStats, 3000);

    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [refreshKey]);

  const stats = data?.stats;
  const lastHit = stats?.lastHits[0];

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-emerald-200">
            Upstream proof
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Protected sample health API
          </h2>
        </div>
        <DatabaseZap className="h-5 w-5 text-emerald-200" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="FHIR patient reads" value={stats?.patientReadHits ?? 0} />
        <Stat label="Prior-auth submissions" value={stats?.priorAuthHits ?? 0} />
        <Stat label="Bulk dump hits" value={stats?.bulkDumpHits ?? 0} />
        <Stat label="Total upstream hits" value={stats?.totalHits ?? 0} />
      </div>

      <div className="mt-4 rounded-md border border-white/10 bg-white/[0.035] p-3">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-200" />
          <div>
            <p className="text-sm font-semibold text-white">
              {latestDecision?.upstream?.called
                ? "Gateway forwarded an approved request upstream."
                : latestDecision
                  ? "Blocked before upstream."
                  : "Waiting for a gateway decision."}
            </p>
            <p className="mt-1 font-mono text-xs text-slate-400">
              {lastHit
                ? `${lastHit.method} ${lastHit.path}`
                : "No upstream calls recorded yet."}
            </p>
          </div>
        </div>
      </div>

      {stats && stats.bulkDumpHits === 0 ? (
        <p className="mt-3 rounded-md border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
          Bulk dump hits are still zero. SketchyScraperAgent has not reached
          the dangerous upstream route.
        </p>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { DatabaseZap } from "lucide-react";

type Hit = {
  ts: string;
  method: string;
  path: string;
};

type StatsResponse = {
  ehr: {
    online: boolean;
    stats: null | {
      patientReads: number;
      conditionReads: number;
      medicationReads: number;
      observationReads: number;
      documentReads: number;
      lastRequests: Hit[];
    };
  };
  payer: {
    online: boolean;
    stats: null | {
      requirementsLookups: number;
      submissions: number;
      statusChecks: number;
      lastRequests: Hit[];
    };
  };
};

type Props = {
  refreshKey: number;
};

function Stat({
  label,
  value
}: {
  label: string;
  value: number | undefined;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value ?? 0}</p>
    </div>
  );
}

export function PriorAuthApiStatsPanel({ refreshKey }: Props) {
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const response = await fetch("/api/upstream/stats", { cache: "no-store" });
      const json = (await response.json()) as StatsResponse;
      if (active) setStats(json);
    }

    void load();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const recent = [
    ...(stats?.ehr.stats?.lastRequests ?? []),
    ...(stats?.payer.stats?.lastRequests ?? [])
  ]
    .sort((a, b) => b.ts.localeCompare(a.ts))
    .slice(0, 8);

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <DatabaseZap className="h-5 w-5 text-cyan-300" />
        API call proof
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Patient reads" value={stats?.ehr.stats?.patientReads} />
        <Stat label="Document reads" value={stats?.ehr.stats?.documentReads} />
        <Stat
          label="Requirement lookups"
          value={stats?.payer.stats?.requirementsLookups}
        />
        <Stat label="Submissions" value={stats?.payer.stats?.submissions} />
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-black/15">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-slate-100">
          Recent HTTP calls
        </div>
        <div className="grid max-h-72 gap-0 overflow-auto">
          {recent.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">
              No API calls yet. Run an electronic prior-auth case.
            </p>
          ) : (
            recent.map((hit) => (
              <div
                key={`${hit.ts}-${hit.method}-${hit.path}`}
                className="grid grid-cols-[70px_minmax(0,1fr)] gap-3 border-b border-white/5 px-4 py-2 text-xs text-slate-300 last:border-b-0"
              >
                <span className="font-semibold text-cyan-100">{hit.method}</span>
                <span className="truncate font-mono">{hit.path}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

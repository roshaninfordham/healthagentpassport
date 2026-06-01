"use client";

import { useEffect, useState } from "react";
import { Activity, Database, FileCog, WifiOff } from "lucide-react";

type StatusResponse = {
  ehr: { online: boolean; status: number | null; latencyMs: number; url: string };
  payer: { online: boolean; status: number | null; latencyMs: number; url: string };
  studio: { online: boolean; url: string; stream: string };
  roiConfig: { loaded: boolean; path: string };
  policyConfig: { loaded: boolean; path: string };
  trustedAgent: { loaded: boolean; path: string };
  demo: { stepDelayMs: number };
};

function StatusPill({
  label,
  online,
  detail
}: {
  label: string;
  online: boolean;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">{label}</p>
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
            online
              ? "bg-emerald-400/15 text-emerald-100"
              : "bg-rose-400/15 text-rose-100"
          }`}
        >
          {online ? "online" : "offline"}
        </span>
      </div>
      <p className="mt-2 truncate text-xs text-slate-400">{detail}</p>
    </div>
  );
}

export function PriorAuthServiceStatusPanel() {
  const [status, setStatus] = useState<StatusResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const response = await fetch("/api/services/status", { cache: "no-store" });
      const json = (await response.json()) as StatusResponse;
      if (active) setStatus(json);
    }

    void load();
    const interval = window.setInterval(() => void load(), 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Activity className="h-5 w-5 text-emerald-300" />
        Live infrastructure
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <StatusPill
          label="Sample EHR API"
          online={status?.ehr.online ?? false}
          detail={status?.ehr.url ?? "/api/demo/ehr"}
        />
        <StatusPill
          label="Sample payer API"
          online={status?.payer.online ?? false}
          detail={status?.payer.url ?? "/api/demo/payer"}
        />
        <StatusPill
          label="Demo stream"
          online={status?.studio.online ?? true}
          detail={status?.studio.stream ?? "/api/demo/stream"}
        />
        <StatusPill
          label="Config bundle"
          online={(status?.roiConfig.loaded ?? false) && (status?.policyConfig.loaded ?? false)}
          detail="roi.yaml + priorauth-policy.yaml"
        />
        <StatusPill
          label="Agent identity"
          online={status?.trustedAgent.loaded ?? false}
          detail="TrustedPriorAuthAgent verified"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
        <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1">
          <Database className="h-3.5 w-3.5 text-cyan-300" />
          Real HTTP services
        </span>
        <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1">
          <FileCog className="h-3.5 w-3.5 text-amber-300" />
          Step delay {status?.demo.stepDelayMs ?? 1200} ms
        </span>
        {!status?.ehr.online || !status?.payer.online ? (
          <span className="inline-flex items-center gap-2 rounded-md border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-rose-100">
            <WifiOff className="h-3.5 w-3.5" />
            Start with pnpm demo
          </span>
        ) : null}
      </div>
    </section>
  );
}

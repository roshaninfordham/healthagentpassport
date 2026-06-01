"use client";

import { useEffect, useState } from "react";
import { Activity, CircleCheck, CircleX, FileCog, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

type ServiceStatus = {
  sampleApi: {
    online: boolean;
    status: number | null;
    latencyMs: number;
    url: string;
  };
  gateway: {
    online: boolean;
    status: number | null;
    latencyMs: number;
    url: string;
  };
  studio: {
    online: boolean;
    url: string;
    stream: string;
  };
  policy: {
    loaded: boolean;
    path: string;
  };
  demo: {
    mode: string;
    stepDelayMs: number;
  };
};

function StatusBadge({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
        online
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
          : "border-rose-400/30 bg-rose-400/10 text-rose-100"
      )}
    >
      {online ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleX className="h-3.5 w-3.5" />}
      {online ? "online" : "offline"}
    </span>
  );
}

export function ServiceStatusPanel() {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [streamConnected, setStreamConnected] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadStatus() {
      const response = await fetch("/api/services/status");
      const json = (await response.json()) as ServiceStatus;
      if (alive) setStatus(json);
    }

    void loadStatus();
    const interval = window.setInterval(loadStatus, 5000);

    const source = new EventSource("/api/events/stream");
    source.onopen = () => setStreamConnected(true);
    source.onerror = () => setStreamConnected(false);

    return () => {
      alive = false;
      window.clearInterval(interval);
      source.close();
    };
  }, []);

  const rows = [
    {
      label: "Sample API",
      url: status?.sampleApi.url ?? "http://localhost:4001/health",
      online: status?.sampleApi.online ?? false,
      icon: Activity
    },
    {
      label: "Gateway",
      url: status?.gateway.url ?? "http://localhost:8787/health",
      online: status?.gateway.online ?? false,
      icon: Radio
    },
    {
      label: "Studio event stream",
      url: "/api/events/stream",
      online: streamConnected,
      icon: Radio
    },
    {
      label: "Policy",
      url: status?.policy.path ?? "healthagent.yaml",
      online: status?.policy.loaded ?? false,
      icon: FileCog
    }
  ];

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-emerald-200">
            Live service status
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Gateway demo connections
          </h2>
        </div>
        <span className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
          demo delay {status?.demo.stepDelayMs ?? 650}ms
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => {
          const Icon = row.icon;

          return (
            <div
              key={row.label}
              className="rounded-md border border-white/10 bg-white/[0.035] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <Icon className="h-4 w-4 text-slate-300" />
                <StatusBadge online={row.online} />
              </div>
              <p className="mt-3 text-sm font-semibold text-white">
                {row.label}
              </p>
              <p className="mt-1 break-words font-mono text-xs leading-5 text-slate-400">
                {row.url}
              </p>
            </div>
          );
        })}
      </div>

      {status && (!status.sampleApi.online || !status.gateway.online) ? (
        <p className="mt-4 rounded-md border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          Start the complete demo with `pnpm demo`, or run `pnpm sample-api`,
          `pnpm gateway`, and `pnpm studio` in separate terminals.
        </p>
      ) : null}
    </section>
  );
}

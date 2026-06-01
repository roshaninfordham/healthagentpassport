import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  Bot,
  FileCheck2,
  Hospital,
  KeyRound,
  Network,
  ShieldCheck,
  Workflow
} from "lucide-react";
import { cn } from "@/lib/utils";

const toneStyles = {
  cyan: {
    shell: "border-cyan-400/25 bg-cyan-400/10",
    icon: "border-cyan-300/25 bg-cyan-300/10 text-cyan-200"
  },
  blue: {
    shell: "border-blue-400/25 bg-blue-400/10",
    icon: "border-blue-300/25 bg-blue-300/10 text-blue-200"
  },
  amber: {
    shell: "border-amber-400/25 bg-amber-400/10",
    icon: "border-amber-300/25 bg-amber-300/10 text-amber-200"
  },
  emerald: {
    shell: "border-emerald-400/35 bg-emerald-400/10",
    icon: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
  },
  slate: {
    shell: "border-white/10 bg-white/[0.04]",
    icon: "border-white/10 bg-white/[0.05] text-slate-200"
  },
  rose: {
    shell: "border-rose-400/25 bg-rose-400/10",
    icon: "border-rose-300/25 bg-rose-300/10 text-rose-200"
  }
} as const;

type Tone = keyof typeof toneStyles;

type StackLayer = {
  label: string;
  detail: string;
  icon: LucideIcon;
  tone: Tone;
  highlight?: boolean;
};

const stackLayers: StackLayer[] = [
  {
    label: "AI Agent",
    detail: "Autonomous workflow caller",
    icon: Bot,
    tone: "cyan"
  },
  {
    label: "Auth0 / Okta",
    detail: "Agent identity, OBO token, token vault",
    icon: KeyRound,
    tone: "blue"
  },
  {
    label: "Valiron",
    detail: "Trust, reputation, payment, route signal",
    icon: Activity,
    tone: "amber"
  },
  {
    label: "HealthAgent Passport",
    detail: "Patient consent, FHIR scopes, healthcare policy, sandbox verdict",
    icon: ShieldCheck,
    tone: "emerald",
    highlight: true
  },
  {
    label: "Kong / Agent Gateway",
    detail: "Routing, rate limits, traffic management",
    icon: Network,
    tone: "slate"
  },
  {
    label: "Health APIs",
    detail: "FHIR, payer, pharmacy, public-health endpoints",
    icon: Hospital,
    tone: "rose"
  }
];

const moatSignals = [
  "Consent graph",
  "FHIR / SMART scopes",
  "Payer policy templates",
  "Behavioral history",
  "Audit exports",
  "Synthetic misuse tests"
];

export function EcosystemPanel() {
  return (
    <section className="glass-panel rounded-lg p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase text-emerald-200">
            Ecosystem position
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-white">
            Where HealthAgent Passport sits
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Generic agent gateways know traffic. HealthAgent Passport knows
            healthcare permission.
          </p>
        </div>

        <div className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-50 lg:max-w-sm">
          <div className="flex items-center gap-2 font-semibold">
            <Workflow className="h-4 w-4" />
            Missing authorization layer
          </div>
          <p className="mt-2 leading-6 text-emerald-100/90">
            The healthcare-specific policy brain between agent identity, trust
            rails, and protected health APIs.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 xl:grid-cols-6">
        {stackLayers.map((layer, index) => {
          const Icon = layer.icon;
          const styles = toneStyles[layer.tone];

          return (
            <div key={layer.label} className="relative">
              <div
                className={cn(
                  "flex min-h-[152px] flex-col rounded-md border p-4",
                  styles.shell,
                  layer.highlight && "shadow-[0_0_0_1px_rgba(52,211,153,0.26)]"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div
                    className={cn(
                      "rounded-md border p-2",
                      styles.icon
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {layer.highlight ? (
                    <span className="rounded-md border border-emerald-300/30 bg-emerald-300/10 px-2 py-1 text-[11px] font-semibold uppercase text-emerald-100">
                      Our layer
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-4 text-sm font-semibold text-white">
                  {layer.label}
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-300">
                  {layer.detail}
                </p>
              </div>

              {index < stackLayers.length - 1 ? (
                <>
                  <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-slate-500 xl:block" />
                  <ArrowDown className="mx-auto mt-1 h-4 w-4 text-slate-500 xl:hidden" />
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <FileCheck2 className="h-4 w-4 text-cyan-200" />
            Partner posture
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Okta tells you who the agent is. Kong routes the agent. Valiron
            scores and monetizes the call. HealthAgent Passport decides whether
            this agent may touch this patient&apos;s healthcare data for this
            task.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {moatSignals.map((signal) => (
            <div
              key={signal}
              className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-200"
            >
              {signal}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

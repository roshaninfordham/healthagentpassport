"use client";

import { motion } from "framer-motion";
import {
  BadgeCheck,
  CircleSlash,
  FileText,
  ReceiptText,
  ShieldAlert
} from "lucide-react";
import type { DemoResultView, GatewayCallView } from "@/lib/client-types";
import { cn, decisionTone, routeTone, shortHash } from "@/lib/utils";
import { TrustGauge } from "./TrustGauge";

type Props = {
  result: DemoResultView | null;
  loading: "trusted" | "sketchy" | null;
};

function getUpstream(call?: GatewayCallView) {
  const data = call?.data;
  if (!data || typeof data !== "object" || !("upstream" in data)) return null;
  return (data as { upstream?: unknown }).upstream;
}

function getBundleCount(call?: GatewayCallView) {
  const upstream = getUpstream(call);
  if (!upstream || typeof upstream !== "object" || !("bundle" in upstream)) {
    return null;
  }

  const bundle = (upstream as { bundle?: { entry?: unknown[] } }).bundle;
  return Array.isArray(bundle?.entry) ? bundle.entry.length : null;
}

function getPriorAuthId(call?: GatewayCallView) {
  const upstream = getUpstream(call);
  if (!upstream || typeof upstream !== "object" || !("priorAuthId" in upstream)) {
    return null;
  }

  return String((upstream as { priorAuthId?: unknown }).priorAuthId ?? "");
}

export function LiveDecisionPanel({ result, loading }: Props) {
  const firstCall = result?.calls[0];
  const finalCall = result?.calls[result.calls.length - 1];
  const call = finalCall ?? firstCall;
  const trust = call?.trust ?? firstCall?.trust;
  const allowed = Boolean(result?.calls.some((item) => item.allowed));
  const title = result
    ? allowed
      ? "ACCESS GRANTED"
      : "ACCESS DENIED"
    : loading
      ? "EVALUATING AGENT"
      : "READY FOR DEMO";
  const bundleCount = getBundleCount(firstCall);
  const priorAuthId = getPriorAuthId(finalCall);
  const icon = allowed ? (
    <BadgeCheck className="h-5 w-5" />
  ) : result ? (
    <ShieldAlert className="h-5 w-5" />
  ) : (
    <CircleSlash className="h-5 w-5" />
  );

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex flex-col gap-5 xl:flex-row">
        <div className="min-w-0 flex-1">
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold",
              allowed
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                : result
                  ? "border-rose-400/40 bg-rose-400/10 text-rose-100"
                  : "border-white/10 bg-white/[0.04] text-slate-200"
            )}
          >
            {icon}
            {title}
          </motion.div>

          <h2 className="mt-4 text-2xl font-semibold text-white">
            {result?.label ?? "HealthAgent Gateway"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            {call?.reason ??
              "Run an agent to produce a signed request, sandbox report, trust route, upstream decision, payment receipt, and audit event."}
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {result?.calls.map((item) => (
              <div
                key={item.requestId}
                className="border-b border-white/10 pb-3 last:border-b-0 md:border-b-0 md:border-l md:pl-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs font-medium",
                      decisionTone(item.decision)
                    )}
                  >
                    {item.decision}
                  </span>
                  <span
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs font-medium",
                      routeTone(item.trust?.route)
                    )}
                  >
                    {item.trust?.route ?? "route"}
                  </span>
                </div>
                <p className="mt-2 break-words font-mono text-xs text-slate-300">
                  {item.requestId}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  HTTP {item.httpStatus}
                </p>
              </div>
            ))}
          </div>

          {result && (
            <div className="mt-5 grid gap-4 border-t border-white/10 pt-4 lg:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-100">
                  <FileText className="h-4 w-4 text-cyan-300" />
                  Care-admin summary
                </div>
                <p className="text-sm leading-6 text-slate-300">
                  {result.summary.safeAdminSummary}
                </p>
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-100">
                  <ReceiptText className="h-4 w-4 text-amber-300" />
                  Payment rail
                </div>
                <p className="text-sm text-slate-300">
                  {call?.payment
                    ? `${call.payment.mode} ${call.payment.status} receipt`
                    : "No charge on denied requests"}
                </p>
                <p className="mt-1 font-mono text-xs text-slate-400">
                  {shortHash(call?.payment?.receiptId)}
                </p>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-5 flex flex-wrap gap-2">
              {bundleCount !== null && (
                <span className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                  FHIR resources: {bundleCount}
                </span>
              )}
              {priorAuthId && (
                <span className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
                  Prior auth: {priorAuthId}
                </span>
              )}
              {!allowed && (
                <span className="rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-1 text-xs text-rose-100">
                  Protected API not called
                </span>
              )}
              {result.summary.safetyFlags.map((flag) => (
                <span
                  key={flag}
                  className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300"
                >
                  {flag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="w-full border-t border-white/10 pt-4 xl:w-[280px] xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
          <TrustGauge
            score={trust?.trustScore ?? 0}
            tier={trust?.tier ?? "pending"}
            route={trust?.route ?? "pending"}
          />
          <div className="mt-2 grid gap-2 text-xs text-slate-400">
            {(trust?.explanation ?? [
              "Identity tells us who the agent is.",
              "Consent tells us what it may access.",
              "Sandboxing tells us how it behaves."
            ]).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

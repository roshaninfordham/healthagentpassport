"use client";

import { useMemo, useState } from "react";
import { Braces, PackageCheck } from "lucide-react";
import type { PriorAuthRunResult } from "@/lib/live-events";

type Props = {
  result: PriorAuthRunResult;
};

const tabs = [
  "EHR Request",
  "EHR Response",
  "Payer Requirements",
  "Prior-Auth Package",
  "Payer Submission Response",
  "Audit Evidence"
] as const;

type Tab = (typeof tabs)[number];

function renderJson(value: unknown) {
  if (!value) return "{}";
  return JSON.stringify(value, null, 2);
}

export function PriorAuthInspector({ result }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("EHR Request");
  const submission = result.submission as
    | { priorAuthId?: string; decision?: string; status?: string }
    | undefined;

  const latestEhrExchange = useMemo(
    () =>
      [...(result.apiExchanges ?? [])]
        .reverse()
        .find((exchange) => exchange.source === "ehr"),
    [result.apiExchanges]
  );
  const payerSubmission = useMemo(
    () =>
      [...(result.apiExchanges ?? [])]
        .reverse()
        .find((exchange) => exchange.id === "submit_prior_auth"),
    [result.apiExchanges]
  );

  const jsonByTab: Record<Tab, unknown> = {
    "EHR Request": latestEhrExchange
      ? {
          method: latestEhrExchange.method,
          url: latestEhrExchange.url,
          requestBody: latestEhrExchange.requestBody ?? null
        }
      : null,
    "EHR Response": latestEhrExchange?.responseBody,
    "Payer Requirements": result.requirements,
    "Prior-Auth Package": result.authPackage,
    "Payer Submission Response": payerSubmission?.responseBody ?? result.submission,
    "Audit Evidence": result.audit
  };

  return (
    <section className="glass-panel min-w-0 rounded-lg p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <PackageCheck className="h-5 w-5 text-emerald-300" />
        Request / response inspector
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs uppercase text-slate-400">Prior-auth ID</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">
            {submission?.priorAuthId ?? "Not submitted"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs uppercase text-slate-400">Status</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {submission?.status ?? "Draft"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs uppercase text-slate-400">Decision</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {submission?.decision ?? "No payer submission"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-black/20">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-sm font-semibold text-slate-100">
          <Braces className="h-4 w-4 text-cyan-300" />
          API evidence
        </div>
        <div className="flex gap-2 overflow-auto border-b border-white/10 px-3 py-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition ${
                activeTab === tab
                  ? "border border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                  : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <pre className="max-h-96 max-w-full overflow-auto p-4 text-xs leading-5 text-slate-300">
          {renderJson(jsonByTab[activeTab])}
        </pre>
      </div>
    </section>
  );
}

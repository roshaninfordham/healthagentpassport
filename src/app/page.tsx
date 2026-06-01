"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DeveloperModePanel } from "@/components/dashboard/DeveloperModePanel";
import { LandingPageExplainer } from "@/components/dashboard/LandingPageExplainer";
import { ManualVsElectronicPanel } from "@/components/dashboard/ManualVsElectronicPanel";
import { MarketBenchmarksPanel } from "@/components/dashboard/MarketBenchmarksPanel";
import { MarketPainPanel } from "@/components/dashboard/MarketPainPanel";
import { PriorAuthApiStatsPanel } from "@/components/dashboard/PriorAuthApiStatsPanel";
import { PriorAuthAuditLedger } from "@/components/dashboard/PriorAuthAuditLedger";
import { PriorAuthCaseCard } from "@/components/dashboard/PriorAuthCaseCard";
import { PriorAuthEvidenceChecklistPanel } from "@/components/dashboard/PriorAuthEvidenceChecklistPanel";
import { PriorAuthInboxPanel } from "@/components/dashboard/PriorAuthInboxPanel";
import { PriorAuthInspector } from "@/components/dashboard/PriorAuthInspector";
import { PriorAuthLiveTimeline } from "@/components/dashboard/PriorAuthLiveTimeline";
import { PriorAuthRoiCalculatorPanel } from "@/components/dashboard/PriorAuthRoiCalculatorPanel";
import { PriorAuthRunControls } from "@/components/dashboard/PriorAuthRunControls";
import { PriorAuthServiceStatusPanel } from "@/components/dashboard/PriorAuthServiceStatusPanel";
import { PriorAuthToolCallsPanel } from "@/components/dashboard/PriorAuthToolCallsPanel";
import { SettingsPanel } from "@/components/dashboard/SettingsPanel";
import { SystemMapPanel } from "@/components/dashboard/SystemMapPanel";
import { WhatThisDoesPanel } from "@/components/dashboard/WhatThisDoesPanel";
import type {
  PriorAuthRunEvent,
  PriorAuthRunResult
} from "@/lib/live-events";

type Scenario = "complete" | "incomplete";
type Tab =
  | "overview"
  | "inbox"
  | "workflow"
  | "roi"
  | "evidence"
  | "audit"
  | "developer"
  | "settings";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "inbox", label: "Prior Auth Inbox" },
  { id: "workflow", label: "Live Workflow" },
  { id: "roi", label: "ROI Calculator" },
  { id: "evidence", label: "Evidence & Requirements" },
  { id: "audit", label: "Audit Ledger" },
  { id: "developer", label: "Developer Mode" },
  { id: "settings", label: "Settings" }
];

function mergeResult(
  result: PriorAuthRunResult,
  details: Record<string, unknown> | undefined
): PriorAuthRunResult {
  if (!details) return result;
  const toolCall = details.toolCall as
    | NonNullable<PriorAuthRunResult["toolCalls"]>[number]
    | undefined;
  const apiExchange = details.apiExchange as
    | NonNullable<PriorAuthRunResult["apiExchanges"]>[number]
    | undefined;

  return {
    ...result,
    priorAuthCase:
      (details.priorAuthCase as PriorAuthRunResult["priorAuthCase"]) ??
      result.priorAuthCase,
    requirements:
      (details.requirements as PriorAuthRunResult["requirements"]) ??
      result.requirements,
    evidence:
      (details.evidence as PriorAuthRunResult["evidence"]) ?? result.evidence,
    authPackage: details.authPackage ?? result.authPackage,
    submission: details.submission ?? result.submission,
    roi: details.roi ?? result.roi,
    practiceRoi: details.practiceRoi ?? result.practiceRoi,
    audit: details.audit ?? result.audit,
    ehrStats: details.ehrStats ?? result.ehrStats,
    payerStats: details.payerStats ?? result.payerStats,
    toolCalls: toolCall
      ? [
          ...(result.toolCalls ?? []).filter((item) => item.id !== toolCall.id),
          toolCall
        ]
      : result.toolCalls,
    apiExchanges: apiExchange
      ? [
          ...(result.apiExchanges ?? []).filter(
            (item) => item.id !== apiExchange.id
          ),
          apiExchange
        ]
      : result.apiExchanges
  };
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState<Scenario | null>(null);
  const [resetting, setResetting] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [events, setEvents] = useState<PriorAuthRunEvent[]>([]);
  const [result, setResult] = useState<PriorAuthRunResult>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const currentRunIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentRunIdRef.current = currentRunId;
  }, [currentRunId]);

  useEffect(() => {
    const source = new EventSource("/api/events/stream");

    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as PriorAuthRunEvent;
      const runId = currentRunIdRef.current;

      if (runId && event.runId !== runId) return;

      setEvents((items) => {
        if (items.some((item) => item.id === event.id)) return items;
        return [...items, event];
      });
      setResult((previous) => mergeResult(previous, event.details));

      if (
        event.phase === "complete" ||
        event.phase === "blocked" ||
        event.status === "failed"
      ) {
        setLoading(null);
        setRefreshKey((key) => key + 1);
        if (event.phase === "complete") {
          toast.success("Electronic prior authorization submitted.");
        } else if (event.phase === "blocked") {
          toast.warning("Draft saved. Missing evidence blocked submission.");
        }
      }
    };

    source.onerror = () => {
      toast.error("Studio event stream disconnected.");
    };

    return () => {
      source.close();
    };
  }, []);

  async function runScenario(scenario: Scenario) {
    setActiveTab("workflow");
    window.requestAnimationFrame(() => {
      document.getElementById("studio")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
    setLoading(scenario);
    currentRunIdRef.current = null;
    setCurrentRunId(null);
    setEvents([]);
    setResult({});

    try {
      const response = await fetch("/api/demo/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario, caseId: "pa-case-001" })
      });
      const json = (await response.json()) as {
        runId?: string;
        error?: string;
      };

      if (!response.ok || !json.runId) {
        throw new Error(json.error || "Demo run failed.");
      }

      setCurrentRunId(json.runId);
      toast.success(
        scenario === "complete"
          ? "Running complete electronic prior-auth case."
          : "Running incomplete documentation guardrail."
      );
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Demo run failed.");
      setLoading(null);
    }
  }

  async function resetDemo() {
    setResetting(true);

    try {
      const response = await fetch("/api/demo/reset", {
        method: "POST",
        headers: { "x-demo-reset-token": "local-demo-reset" }
      });

      if (!response.ok) {
        const json = (await response.json()) as { error?: string };
        throw new Error(json.error || "Reset failed.");
      }

      setCurrentRunId(null);
      setEvents([]);
      setResult({});
      setRefreshKey((key) => key + 1);
      toast.success("Demo state reset.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Reset failed.");
    } finally {
      setResetting(false);
    }
  }

  function openStudio(tab: Tab = "overview") {
    setActiveTab(tab);
    window.requestAnimationFrame(() => {
      document.getElementById("studio")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }

  return (
    <main className="min-h-screen text-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <LandingPageExplainer
          loading={loading}
          onRun={runScenario}
          onDeveloperMode={() => openStudio("developer")}
        />

        <nav
          id="studio"
          className="glass-panel sticky top-3 z-10 flex scroll-mt-3 gap-2 overflow-auto rounded-lg p-2"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "border border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                  : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "overview" ? (
          <>
            <WhatThisDoesPanel />
            <PriorAuthServiceStatusPanel />
            <SystemMapPanel />
            <MarketBenchmarksPanel />
            <ManualVsElectronicPanel />
            <MarketPainPanel />
          </>
        ) : null}

        {activeTab === "inbox" ? (
          <>
            <PriorAuthInboxPanel onRun={runScenario} loading={loading} />
            <PriorAuthServiceStatusPanel />
          </>
        ) : null}

        {activeTab === "workflow" ? (
          <>
            <section className="grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)]">
              <div className="grid gap-5">
                <PriorAuthRunControls
                  loading={loading}
                  resetting={resetting}
                  onRun={runScenario}
                  onReset={resetDemo}
                />
                <PriorAuthCaseCard priorAuthCase={result.priorAuthCase} />
              </div>
              <PriorAuthLiveTimeline
                events={events}
                loading={loading !== null}
              />
            </section>
            <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <PriorAuthToolCallsPanel result={result} />
              <PriorAuthInspector result={result} />
            </section>
          </>
        ) : null}

        {activeTab === "roi" ? (
          <>
            <PriorAuthRoiCalculatorPanel roi={result.roi} />
            <MarketBenchmarksPanel />
          </>
        ) : null}

        {activeTab === "evidence" ? (
          <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <PriorAuthEvidenceChecklistPanel evidence={result.evidence} />
            <PriorAuthInspector result={result} />
          </section>
        ) : null}

        {activeTab === "audit" ? (
          <>
            <PriorAuthApiStatsPanel refreshKey={refreshKey} />
            <PriorAuthAuditLedger events={events} result={result} />
          </>
        ) : null}

        {activeTab === "developer" ? <DeveloperModePanel /> : null}

        {activeTab === "settings" ? <SettingsPanel /> : null}
      </div>
    </main>
  );
}

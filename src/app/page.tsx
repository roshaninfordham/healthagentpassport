"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Hero } from "@/components/dashboard/Hero";
import { ManualVsElectronicPanel } from "@/components/dashboard/ManualVsElectronicPanel";
import { MarketPainPanel } from "@/components/dashboard/MarketPainPanel";
import { PriorAuthApiStatsPanel } from "@/components/dashboard/PriorAuthApiStatsPanel";
import { PriorAuthAuditLedger } from "@/components/dashboard/PriorAuthAuditLedger";
import { PriorAuthCaseCard } from "@/components/dashboard/PriorAuthCaseCard";
import { PriorAuthEvidenceChecklistPanel } from "@/components/dashboard/PriorAuthEvidenceChecklistPanel";
import { PriorAuthInspector } from "@/components/dashboard/PriorAuthInspector";
import { PriorAuthLiveTimeline } from "@/components/dashboard/PriorAuthLiveTimeline";
import { PriorAuthRoiCalculatorPanel } from "@/components/dashboard/PriorAuthRoiCalculatorPanel";
import { PriorAuthRunControls } from "@/components/dashboard/PriorAuthRunControls";
import { PriorAuthServiceStatusPanel } from "@/components/dashboard/PriorAuthServiceStatusPanel";
import type {
  PriorAuthRunEvent,
  PriorAuthRunResult
} from "@/lib/live-events";

type Scenario = "complete" | "incomplete";

function mergeResult(
  result: PriorAuthRunResult,
  details: Record<string, unknown> | undefined
): PriorAuthRunResult {
  if (!details) return result;

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
    payerStats: details.payerStats ?? result.payerStats
  };
}

export default function Home() {
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

  return (
    <main className="min-h-screen text-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <Hero />
        <MarketPainPanel />
        <PriorAuthServiceStatusPanel />
        <ManualVsElectronicPanel />

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
          <PriorAuthLiveTimeline events={events} loading={loading !== null} />
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <PriorAuthEvidenceChecklistPanel evidence={result.evidence} />
          <PriorAuthRoiCalculatorPanel
            roi={result.roi}
            practiceRoi={result.practiceRoi}
          />
        </section>

        <PriorAuthApiStatsPanel refreshKey={refreshKey} />

        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <PriorAuthInspector result={result} />
          <PriorAuthAuditLedger events={events} result={result} />
        </section>
      </div>
    </main>
  );
}

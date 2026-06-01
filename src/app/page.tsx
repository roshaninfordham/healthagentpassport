"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DemoControls } from "@/components/dashboard/DemoControls";
import { DeveloperQuickstartPanel } from "@/components/dashboard/DeveloperQuickstartPanel";
import { EcosystemPanel } from "@/components/dashboard/EcosystemPanel";
import { LiveAuditEvidenceTable } from "@/components/dashboard/LiveAuditEvidenceTable";
import { Hero } from "@/components/dashboard/Hero";
import { LiveGatewayDecisionBanner } from "@/components/dashboard/LiveGatewayDecisionBanner";
import { LiveRunTimeline } from "@/components/dashboard/LiveRunTimeline";
import { PatientPassportCard } from "@/components/dashboard/PatientPassportCard";
import { PresenterScriptPanel } from "@/components/dashboard/PresenterScriptPanel";
import { ProtectedApiCard } from "@/components/dashboard/ProtectedApiCard";
import { RequestDecisionInspector } from "@/components/dashboard/RequestDecisionInspector";
import { SandboxPanel } from "@/components/dashboard/SandboxPanel";
import { ServiceStatusPanel } from "@/components/dashboard/ServiceStatusPanel";
import { ToolCallsPanel } from "@/components/dashboard/ToolCallsPanel";
import { UpstreamProofCard } from "@/components/dashboard/UpstreamProofCard";
import type {
  GatewayDecisionEvent,
  RunEvent
} from "@/lib/live-events";

export default function Home() {
  const [loading, setLoading] = useState<"trusted" | "sketchy" | null>(null);
  const [resetting, setResetting] = useState(false);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);
  const [upstreamRefreshKey, setUpstreamRefreshKey] = useState(0);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [expectedResponses, setExpectedResponses] = useState(1);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [decisions, setDecisions] = useState<GatewayDecisionEvent[]>([]);
  const currentRunIdRef = useRef<string | null>(null);
  const expectedResponsesRef = useRef(1);

  useEffect(() => {
    currentRunIdRef.current = currentRunId;
  }, [currentRunId]);

  useEffect(() => {
    expectedResponsesRef.current = expectedResponses;
  }, [expectedResponses]);

  useEffect(() => {
    const source = new EventSource("/api/events/stream");

    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as RunEvent;
      const runId = currentRunIdRef.current;

      if (runId && event.runId !== runId) return;

      setEvents((items) => {
        if (items.some((item) => item.id === event.id)) return items;
        const next = [...items, event];
        const responseCount = next.filter(
          (item) => item.phase === "return_response"
        ).length;

        if (
          event.phase === "return_response" &&
          (responseCount >= expectedResponsesRef.current ||
            event.status === "failed")
        ) {
          setLoading(null);
          setAuditRefreshKey((key) => key + 1);
          setUpstreamRefreshKey((key) => key + 1);
        }

        return next;
      });

      const decision = event.details?.decision;
      if (decision && typeof decision === "object") {
        setDecisions((items) => {
          const typedDecision = decision as GatewayDecisionEvent;
          return [
            ...items.filter((item) => item.requestId !== typedDecision.requestId),
            typedDecision
          ];
        });
      }
    };

    source.onerror = () => {
      toast.error("Studio event stream disconnected.");
    };

    return () => {
      source.close();
    };
  }, []);

  async function runScenario(scenario: "trusted" | "sketchy") {
    setLoading(scenario);
    setEvents([]);
    setDecisions([]);
    setExpectedResponses(scenario === "trusted" ? 2 : 1);

    try {
      const response = await fetch("/api/demo/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario })
      });
      const json = (await response.json()) as {
        runId?: string;
        expectedRequests?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(json.error || "Demo run failed.");
      }

      setCurrentRunId(json.runId ?? null);
      setExpectedResponses(json.expectedRequests ?? (scenario === "trusted" ? 2 : 1));
      toast.success(
        scenario === "trusted"
          ? "TrustedCareAgent launched against the live gateway."
          : "SketchyScraperAgent launched against the live gateway."
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
      setDecisions([]);
      setAuditRefreshKey((key) => key + 1);
      setUpstreamRefreshKey((key) => key + 1);
      toast.success("Demo data reset.");
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

        <DeveloperQuickstartPanel />

        <ServiceStatusPanel />

        <EcosystemPanel />

        <LiveGatewayDecisionBanner decisions={decisions} loading={loading} />

        <section className="grid gap-5 lg:grid-cols-[1fr_1fr_1fr]">
          <PatientPassportCard refreshKey={auditRefreshKey} />
          <UpstreamProofCard
            decisions={decisions}
            refreshKey={upstreamRefreshKey}
          />
          <ProtectedApiCard />
        </section>

        <section className="grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)]">
          <DemoControls
            loading={loading}
            resetting={resetting}
            onRun={runScenario}
            onReset={resetDemo}
          />
          <LiveRunTimeline
            events={events}
            expectedResponses={expectedResponses}
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <ToolCallsPanel events={events} decisions={decisions} />
          <RequestDecisionInspector decisions={decisions} />
        </section>

        <SandboxPanel
          sandboxReport={
            decisions[decisions.length - 1]
              ? {
                  ok: decisions[decisions.length - 1].sandbox.verdict !== "block",
                  mode: decisions[decisions.length - 1].sandbox.mode,
                  runtime: "deterministic mock sandbox",
                  agentId: decisions[decisions.length - 1].agentId,
                  scenario: decisions[decisions.length - 1].agentId,
                  observedEvents: [],
                  riskScore: decisions[decisions.length - 1].sandbox.riskScore,
                  verdict: decisions[decisions.length - 1].sandbox.verdict,
                  routeImpact:
                    decisions[decisions.length - 1].sandbox.verdict === "block"
                      ? "downgrade_to_sandbox_only"
                      : "no_change",
                  signals: decisions[decisions.length - 1].sandbox.signals,
                  stdout: decisions[decisions.length - 1].sandbox.signals,
                  stderr: [],
                  durationMs: 650
                }
              : undefined
          }
          loading={loading}
        />

        <PresenterScriptPanel />

        <LiveAuditEvidenceTable decisions={decisions} />
      </div>
    </main>
  );
}

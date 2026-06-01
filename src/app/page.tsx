"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AuditLogTable } from "@/components/dashboard/AuditLogTable";
import { DemoControls } from "@/components/dashboard/DemoControls";
import { FlowMap } from "@/components/dashboard/FlowMap";
import { Hero } from "@/components/dashboard/Hero";
import { LiveDecisionPanel } from "@/components/dashboard/LiveDecisionPanel";
import { PatientPassportCard } from "@/components/dashboard/PatientPassportCard";
import { ProtectedApiCard } from "@/components/dashboard/ProtectedApiCard";
import { SandboxPanel } from "@/components/dashboard/SandboxPanel";
import type { DemoResultView } from "@/lib/client-types";

export default function Home() {
  const [loading, setLoading] = useState<"trusted" | "sketchy" | null>(null);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<DemoResultView | null>(null);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);

  async function runScenario(scenario: "trusted" | "sketchy") {
    setLoading(scenario);

    try {
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario })
      });
      const json = (await response.json()) as DemoResultView & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(json.error || "Demo run failed.");
      }

      setResult(json);
      setAuditRefreshKey((key) => key + 1);
      toast.success(
        scenario === "trusted"
          ? "TrustedCareAgent completed the approved workflow."
          : "SketchyScraperAgent was blocked before protected data access."
      );
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Demo run failed.");
    } finally {
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

      setResult(null);
      setAuditRefreshKey((key) => key + 1);
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

        <section className="grid gap-5 lg:grid-cols-[1fr_1.8fr_1fr]">
          <PatientPassportCard refreshKey={auditRefreshKey} />
          <FlowMap result={result} loading={loading} />
          <ProtectedApiCard />
        </section>

        <section className="grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)]">
          <DemoControls
            loading={loading}
            resetting={resetting}
            onRun={runScenario}
            onReset={resetDemo}
          />
          <LiveDecisionPanel result={result} loading={loading} />
        </section>

        <SandboxPanel sandboxReport={result?.sandboxReport} loading={loading} />

        <AuditLogTable refreshKey={auditRefreshKey} />
      </div>
    </main>
  );
}

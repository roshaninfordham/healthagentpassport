import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { prisma } from "@/lib/prisma";
import type {
  SandboxMode,
  SandboxObservedEvent,
  SandboxReport,
  SandboxScenario
} from "./sandbox-types";
import { runMockSandbox } from "./mock-sandbox";
import {
  routeImpactFromVerdict,
  scoreSandboxEvents,
  signalsFromEvents,
  verdictFromRiskScore
} from "./score";

const execFileAsync = promisify(execFile);

function getSandboxMode(): SandboxMode {
  const mode = process.env.SANDBOX_MODE;
  if (mode === "gvisor" || mode === "docker") return mode;
  return "mock";
}

function dockerArgsForScenario(scenario: SandboxScenario): string[] {
  const image = process.env.SANDBOX_IMAGE || "healthagent-sandbox-runner:local";
  const memory = process.env.SANDBOX_MEMORY || "128m";
  const cpus = process.env.SANDBOX_CPUS || "0.5";
  const network = process.env.SANDBOX_NETWORK || "none";
  const runtimeArgs = getSandboxMode() === "gvisor" ? ["--runtime=runsc"] : [];

  return [
    "run",
    "--rm",
    ...runtimeArgs,
    "--network",
    network,
    "--memory",
    memory,
    "--cpus",
    cpus,
    "--pids-limit",
    "64",
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    image,
    scenario
  ];
}

function normalizeEvents(value: unknown): SandboxObservedEvent[] {
  if (!Array.isArray(value)) return [];
  return value.filter((event): event is SandboxObservedEvent => {
    return (
      Boolean(event) &&
      typeof event === "object" &&
      typeof (event as SandboxObservedEvent).type === "string" &&
      typeof (event as SandboxObservedEvent).target === "string" &&
      ["low", "medium", "high", "critical"].includes(
        (event as SandboxObservedEvent).risk
      )
    );
  });
}

async function persistSandboxRun(
  report: SandboxReport
): Promise<SandboxReport> {
  const run = await prisma.sandboxRun.create({
    data: {
      id: randomUUID(),
      agentId: report.agentId,
      scenario: report.scenario,
      mode: report.mode,
      runtime: report.runtime,
      riskScore: report.riskScore,
      verdict: report.verdict,
      routeImpact: report.routeImpact,
      observedEventsJson: JSON.stringify(report.observedEvents),
      signalsJson: JSON.stringify(report.signals),
      stdoutJson: JSON.stringify(report.stdout),
      stderrJson: JSON.stringify(report.stderr),
      durationMs: report.durationMs,
      error: report.error ?? null
    }
  });

  return { ...report, id: run.id };
}

export async function runAgentSandbox(
  scenario: SandboxScenario
): Promise<SandboxReport> {
  const mode = getSandboxMode();

  if (mode === "mock") {
    return persistSandboxRun(await runMockSandbox(scenario));
  }

  if (process.env.SANDBOX_ALLOW_DOCKER !== "true") {
    return persistSandboxRun({
      ...(await runMockSandbox(scenario)),
      mode: "mock",
      runtime: "mock fallback because SANDBOX_ALLOW_DOCKER is not true"
    });
  }

  const startedAt = Date.now();

  try {
    const timeout = Number(process.env.SANDBOX_TIMEOUT_MS || 5000);
    const { stdout, stderr } = await execFileAsync(
      "docker",
      dockerArgsForScenario(scenario),
      { timeout, maxBuffer: 1024 * 1024 }
    );

    const parsed = JSON.parse(stdout.trim()) as {
      agentId?: string;
      observedEvents?: unknown;
      stdout?: string[];
      stderr?: string[];
    };

    const observedEvents = normalizeEvents(parsed.observedEvents);
    const riskScore = scoreSandboxEvents(observedEvents);
    const verdict = verdictFromRiskScore(riskScore);

    return persistSandboxRun({
      ok: true,
      mode,
      runtime: mode === "gvisor" ? "gVisor runsc" : "Docker default runtime",
      agentId: parsed.agentId || scenario,
      scenario,
      observedEvents,
      riskScore,
      verdict,
      routeImpact: routeImpactFromVerdict(verdict),
      signals: signalsFromEvents(observedEvents),
      stdout: parsed.stdout || [stdout],
      stderr: parsed.stderr || (stderr ? [stderr] : []),
      durationMs: Date.now() - startedAt
    });
  } catch (error) {
    const fallback = await runMockSandbox(scenario);

    return persistSandboxRun({
      ...fallback,
      ok: false,
      mode: "mock",
      runtime: "mock fallback after sandbox execution failure",
      error: error instanceof Error ? error.message : "Unknown sandbox error"
    });
  }
}

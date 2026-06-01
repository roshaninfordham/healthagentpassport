import { randomUUID } from "node:crypto";
import type { RunEvent, RunEventPhase, RunEventStatus } from "./types.js";

export type EventEmitterContext = {
  runId: string;
  requestId: string;
  events: StudioEventSink;
  demoDelayMs: number;
};

export class StudioEventSink {
  constructor(private readonly studioUrl?: string) {}

  async emit(input: {
    runId: string;
    requestId: string;
    phase: RunEventPhase;
    label: string;
    status: RunEventStatus;
    durationMs?: number;
    details?: Record<string, unknown>;
  }): Promise<RunEvent> {
    const event: RunEvent = {
      id: randomUUID(),
      runId: input.runId,
      requestId: input.requestId,
      ts: new Date().toISOString(),
      phase: input.phase,
      label: input.label,
      status: input.status,
      durationMs: input.durationMs,
      details: input.details
    };

    if (!this.studioUrl) return event;

    try {
      await fetch(new URL("/api/events/ingest", this.studioUrl), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event })
      });
    } catch {
      // Gateway operation must not depend on Studio being online.
    }

    return event;
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeResult(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return {};
  if (typeof value !== "object") return { value };

  if (Array.isArray(value)) {
    return { count: value.length };
  }

  return value as Record<string, unknown>;
}

export async function runStep<T>(
  ctx: EventEmitterContext,
  phase: RunEventPhase,
  label: string,
  fn: () => Promise<T>,
  details: Record<string, unknown> = {}
): Promise<T> {
  const startedAt = Date.now();

  await ctx.events.emit({
    runId: ctx.runId,
    requestId: ctx.requestId,
    phase,
    label,
    status: "running",
    details
  });

  if (ctx.demoDelayMs > 0) {
    await sleep(ctx.demoDelayMs);
  }

  try {
    const result = await fn();

    await ctx.events.emit({
      runId: ctx.runId,
      requestId: ctx.requestId,
      phase,
      label,
      status: "passed",
      durationMs: Date.now() - startedAt,
      details: summarizeResult(result)
    });

    return result;
  } catch (error) {
    await ctx.events.emit({
      runId: ctx.runId,
      requestId: ctx.requestId,
      phase,
      label,
      status: "failed",
      durationMs: Date.now() - startedAt,
      details: {
        error: error instanceof Error ? error.message : "Unknown error"
      }
    });

    throw error;
  }
}

export async function emitInfo(
  ctx: EventEmitterContext,
  phase: RunEventPhase,
  label: string,
  details: Record<string, unknown> = {}
) {
  await ctx.events.emit({
    runId: ctx.runId,
    requestId: ctx.requestId,
    phase,
    label,
    status: "info",
    details
  });
}

export async function emitBlocked(
  ctx: EventEmitterContext,
  phase: RunEventPhase,
  label: string,
  details: Record<string, unknown> = {}
) {
  await ctx.events.emit({
    runId: ctx.runId,
    requestId: ctx.requestId,
    phase,
    label,
    status: "blocked",
    details
  });
}

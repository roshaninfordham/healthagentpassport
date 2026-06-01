import { randomUUID } from "node:crypto";
import { z } from "zod";
import { runPriorAuthWorkflowStream } from "@/lib/priorauth-stream-runner";
import type { PriorAuthRunEvent } from "@priorauth/passport-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  scenario: z.enum(["complete", "incomplete"]).default("complete"),
  caseId: z.string().default("pa-case-001")
});

function ndjson(value: unknown) {
  return `${JSON.stringify(value)}\n`;
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid demo stream request.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  let streamRunId: string = randomUUID();
  let streamCaseId = parsed.data.caseId;
  const origin = new URL(request.url).origin;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (value: unknown) => {
        controller.enqueue(encoder.encode(ndjson(value)));
      };

      try {
        await runPriorAuthWorkflowStream({
          scenario: parsed.data.scenario,
          origin,
          emit: (event: PriorAuthRunEvent) => {
            streamRunId = event.runId;
            streamCaseId = event.caseId;
            write(event);
          }
        });
      } catch (error) {
        write({
          id: randomUUID(),
          runId: streamRunId,
          caseId: streamCaseId,
          timestamp: new Date().toISOString(),
          phase: "complete",
          label: "Demo stream failed",
          status: "failed",
          details: {
            error: error instanceof Error ? error.message : "Unknown error"
          }
        } satisfies PriorAuthRunEvent);
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      "x-demo-synthetic-only": "true",
      "x-demo-no-medical-decisions": "true"
    }
  });
}

import { z } from "zod";
import { ingestRunEvent } from "@/lib/live-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const eventSchema = z.object({
  id: z.string(),
  runId: z.string(),
  caseId: z.string(),
  timestamp: z.string(),
  phase: z.enum([
    "start",
    "load_case",
    "verify_agent",
    "fetch_patient",
    "fetch_conditions",
    "fetch_medications",
    "fetch_observations",
    "fetch_documents",
    "discover_payer_requirements",
    "match_evidence",
    "build_package",
    "submit_prior_auth",
    "calculate_roi",
    "write_audit",
    "complete",
    "blocked"
  ]),
  label: z.string(),
  status: z.enum(["queued", "running", "passed", "failed", "blocked", "info"]),
  durationMs: z.number().optional(),
  details: z.record(z.unknown()).optional()
});

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = z.object({ event: eventSchema }).safeParse(json);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid event payload.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const run = ingestRunEvent(parsed.data.event);
  return Response.json({
    ok: true,
    runId: run.runId,
    eventCount: run.events.length
  });
}

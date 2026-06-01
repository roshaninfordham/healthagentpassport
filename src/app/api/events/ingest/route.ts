import { z } from "zod";
import { ingestRunEvent } from "@/lib/live-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const eventSchema = z.object({
  id: z.string(),
  runId: z.string(),
  requestId: z.string(),
  ts: z.string(),
  phase: z.enum([
    "receive_request",
    "parse_policy",
    "match_route_policy",
    "verify_agent_identity",
    "check_timestamp",
    "check_nonce_replay",
    "run_behavioral_sandbox",
    "load_patient_delegation",
    "check_required_scopes",
    "compute_trust_score",
    "create_payment_receipt",
    "fetch_upstream_api",
    "hash_response",
    "write_audit_event",
    "return_response"
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

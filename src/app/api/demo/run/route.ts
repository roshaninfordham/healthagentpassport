import { randomUUID } from "node:crypto";
import { z } from "zod";
import { runElectronicPriorAuthDemo } from "@/lib/priorauth-demo-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  scenario: z.enum(["complete", "incomplete"]),
  caseId: z.string().default("pa-case-001")
});

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return Response.json({ error: "Invalid demo request." }, { status: 400 });
  }

  const runId = randomUUID();

  void runElectronicPriorAuthDemo({
    runId,
    caseId: parsed.data.caseId,
    scenario: parsed.data.scenario,
    origin: new URL(request.url).origin
  });

  return Response.json({
    runId,
    caseId: parsed.data.caseId,
    scenario: parsed.data.scenario
  });
}

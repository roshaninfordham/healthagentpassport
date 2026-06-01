import { getRun } from "@/lib/live-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { runId: string } }
) {
  const run = getRun(params.runId);

  if (!run) {
    return Response.json({ error: "Run not found." }, { status: 404 });
  }

  return Response.json(run);
}

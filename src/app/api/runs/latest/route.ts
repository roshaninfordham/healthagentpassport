import { getLatestRun, getRecentRuns } from "@/lib/live-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    latest: getLatestRun(),
    recent: getRecentRuns()
  });
}

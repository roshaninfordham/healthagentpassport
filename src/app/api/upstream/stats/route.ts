export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const upstreamStatsUrl =
  process.env.SAMPLE_API_STATS_URL ?? "http://localhost:4001/stats";

export async function GET() {
  try {
    const response = await fetch(upstreamStatsUrl, { cache: "no-store" });
    const stats = await response.json();

    return Response.json({
      online: response.ok,
      stats
    });
  } catch {
    return Response.json({
      online: false,
      stats: {
        totalHits: 0,
        patientReadHits: 0,
        priorAuthHits: 0,
        bulkDumpHits: 0,
        lastHits: []
      }
    });
  }
}

export async function POST() {
  try {
    const response = await fetch("http://localhost:4001/stats/reset", {
      method: "POST"
    });

    return Response.json({
      online: response.ok,
      stats: await response.json()
    });
  } catch {
    return Response.json({ online: false }, { status: 503 });
  }
}

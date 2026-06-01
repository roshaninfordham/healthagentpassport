import {
  getDemoWorkflowUrls,
  getInternalDemoStats,
  resetInternalDemoStats
} from "@/lib/internal-demo-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fetchStats(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    return {
      online: response.ok,
      stats: await response.json()
    };
  } catch {
    return {
      online: false,
      stats: null
    };
  }
}

export async function GET(request: Request) {
  const urls = getDemoWorkflowUrls(new URL(request.url).origin);
  const internalStats = getInternalDemoStats();

  const [ehr, payer] = await Promise.all([
    urls.ehr.internal
      ? Promise.resolve({ online: true, stats: internalStats.ehr })
      : fetchStats(urls.ehr.stats().fetchUrl),
    urls.payer.internal
      ? Promise.resolve({ online: true, stats: internalStats.payer })
      : fetchStats(urls.payer.stats().fetchUrl)
  ]);

  return Response.json({ ehr, payer });
}

export async function POST(request: Request) {
  const urls = getDemoWorkflowUrls(new URL(request.url).origin);

  if (urls.ehr.internal || urls.payer.internal) {
    resetInternalDemoStats();
  }

  await Promise.all([
    urls.ehr.internal
      ? Promise.resolve(null)
      : fetch(urls.ehr.resetStats().fetchUrl, { method: "POST" }).catch(
          () => null
        ),
    urls.payer.internal
      ? Promise.resolve(null)
      : fetch(urls.payer.resetStats().fetchUrl, { method: "POST" }).catch(
          () => null
        )
  ]);

  return GET(request);
}

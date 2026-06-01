import { clearRuns } from "@/lib/live-events";
import {
  getDemoWorkflowUrls,
  resetInternalDemoStats
} from "@/lib/internal-demo-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  clearRuns();
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

  return Response.json({ ok: true });
}

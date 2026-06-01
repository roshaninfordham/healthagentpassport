import { access } from "node:fs/promises";
import { getDemoStepDelayMs } from "@/lib/demo-config";
import { getDemoWorkflowUrls } from "@/lib/internal-demo-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function checkHttp(url: string, displayUrl = url) {
  const startedAt = Date.now();

  try {
    const response = await fetch(url, { cache: "no-store" });

    return {
      online: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      url: displayUrl
    };
  } catch {
    return {
      online: false,
      status: null,
      latencyMs: Date.now() - startedAt,
      url: displayUrl
    };
  }
}

function internalStatus(url: string) {
  return {
    online: true,
    status: 200,
    latencyMs: 0,
    url
  };
}

async function checkFile(path: string) {
  try {
    await access(path);
    return { loaded: true, path };
  } catch {
    return { loaded: false, path };
  }
}

export async function GET(request: Request) {
  const urls = getDemoWorkflowUrls(new URL(request.url).origin);
  const ehrHealth = urls.ehr.health();
  const payerHealth = urls.payer.health();

  const [ehr, payer, roiConfig, policyConfig, trustedAgent] = await Promise.all([
    urls.ehr.internal
      ? Promise.resolve(internalStatus(urls.ehr.baseDisplayUrl))
      : checkHttp(ehrHealth.fetchUrl, ehrHealth.displayUrl),
    urls.payer.internal
      ? Promise.resolve(internalStatus(urls.payer.baseDisplayUrl))
      : checkHttp(payerHealth.fetchUrl, payerHealth.displayUrl),
    checkFile("config/roi.yaml"),
    checkFile("config/priorauth-policy.yaml"),
    checkFile(".priorauth/agents/trusted-priorauth-agent.json")
  ]);

  return Response.json({
    ehr,
    payer,
    studio: {
      online: true,
      url: urls.studio.baseDisplayUrl,
      stream: urls.studio.ndjsonStream,
      sseStream: urls.studio.sseStream,
      ndjsonStream: urls.studio.ndjsonStream
    },
    roiConfig,
    policyConfig,
    trustedAgent,
    demo: {
      stepDelayMs: getDemoStepDelayMs()
    }
  });
}

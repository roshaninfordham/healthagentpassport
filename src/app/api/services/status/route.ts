import { access } from "node:fs/promises";
import { getDemoStepDelayMs } from "@/lib/demo-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function checkHttp(url: string) {
  const startedAt = Date.now();

  try {
    const response = await fetch(url, { cache: "no-store" });

    return {
      online: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      url
    };
  } catch {
    return {
      online: false,
      status: null,
      latencyMs: Date.now() - startedAt,
      url
    };
  }
}

async function checkFile(path: string) {
  try {
    await access(path);
    return { loaded: true, path };
  } catch {
    return { loaded: false, path };
  }
}

export async function GET() {
  const ehrUrl = process.env.EHR_API_URL ?? "http://localhost:4001";
  const payerUrl = process.env.PAYER_API_URL ?? "http://localhost:4002";

  const [ehr, payer, roiConfig, policyConfig, trustedAgent] = await Promise.all([
    checkHttp(`${ehrUrl}/health`),
    checkHttp(`${payerUrl}/health`),
    checkFile("config/roi.yaml"),
    checkFile("config/priorauth-policy.yaml"),
    checkFile(".priorauth/agents/trusted-priorauth-agent.json")
  ]);

  return Response.json({
    ehr,
    payer,
    studio: {
      online: true,
      url: "http://localhost:3000",
      stream: "/api/events/stream"
    },
    roiConfig,
    policyConfig,
    trustedAgent,
    demo: {
      stepDelayMs: getDemoStepDelayMs()
    }
  });
}

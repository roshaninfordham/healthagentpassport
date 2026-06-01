import { access } from "node:fs/promises";

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
  const sampleApiUrl =
    process.env.SAMPLE_API_URL ?? "http://localhost:4001/health";
  const gatewayUrl = process.env.GATEWAY_URL ?? "http://localhost:8787/health";

  const [sampleApi, gateway, policy] = await Promise.all([
    checkHttp(sampleApiUrl),
    checkHttp(gatewayUrl),
    checkFile("healthagent.yaml")
  ]);

  return Response.json({
    sampleApi,
    gateway,
    studio: {
      online: true,
      url: "http://localhost:3000",
      stream: "/api/events/stream"
    },
    policy,
    demo: {
      mode: process.env.HAP_DEMO_MODE ?? "true",
      stepDelayMs: Number(process.env.HAP_DEMO_STEP_DELAY_MS ?? 650)
    }
  });
}

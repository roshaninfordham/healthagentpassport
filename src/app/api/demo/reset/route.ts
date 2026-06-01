import { clearRuns } from "@/lib/live-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  clearRuns();
  const ehrUrl = process.env.EHR_API_URL ?? "http://localhost:4001";
  const payerUrl = process.env.PAYER_API_URL ?? "http://localhost:4002";

  await Promise.all([
    fetch(`${ehrUrl}/stats/reset`, { method: "POST" }).catch(
      () => null
    ),
    fetch(`${payerUrl}/stats/reset`, { method: "POST" }).catch(
      () => null
    )
  ]);

  return Response.json({ ok: true });
}

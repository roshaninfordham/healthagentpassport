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

export async function GET() {
  const ehrUrl = process.env.EHR_API_URL ?? "http://localhost:4001";
  const payerUrl = process.env.PAYER_API_URL ?? "http://localhost:4002";

  const [ehr, payer] = await Promise.all([
    fetchStats(`${ehrUrl}/stats`),
    fetchStats(`${payerUrl}/stats`)
  ]);

  return Response.json({ ehr, payer });
}

export async function POST() {
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

  return GET();
}

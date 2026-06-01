export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    name: "HealthAgent Passport",
    demoMode: {
      valiron: process.env.VALIRON_MODE || "mock",
      solana: process.env.SOLANA_MODE || "mock",
      payment: process.env.PAYMENT_MODE || "mock",
      llm: process.env.LLM_MODE || "mock",
      sandbox: process.env.SANDBOX_MODE || "mock"
    }
  });
}

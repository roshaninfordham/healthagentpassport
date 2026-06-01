import { getDemoStepDelayMs } from "@/lib/demo-config";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    name: "PriorAuth Passport",
    demoMode: {
      ehr: process.env.EHR_API_URL || "http://localhost:4001",
      payer: process.env.PAYER_API_URL || "http://localhost:4002",
      stepDelayMs: getDemoStepDelayMs(),
      syntheticOnly: true
    }
  });
}

import { getDemoStepDelayMs } from "@/lib/demo-config";
import { getDemoWorkflowUrls } from "@/lib/internal-demo-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const urls = getDemoWorkflowUrls(new URL(request.url).origin);

  return Response.json({
    ok: true,
    name: "PriorAuth Passport",
    demoMode: {
      ehr: urls.ehr.baseDisplayUrl,
      payer: urls.payer.baseDisplayUrl,
      stream: urls.studio.ndjsonStream,
      stepDelayMs: getDemoStepDelayMs(),
      syntheticOnly: true,
      noMedicalDecisions: true
    }
  });
}

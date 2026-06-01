import { z } from "zod";
import { runAgentSandbox } from "@/lib/sandbox/sandbox-runner";

export const runtime = "nodejs";

const schema = z.object({
  scenario: z.enum(["trusted-care-agent", "sketchy-scraper-agent"])
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid sandbox scenario",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const result = await runAgentSandbox(parsed.data.scenario);
  return Response.json(result, { status: result.ok ? 200 : 207 });
}

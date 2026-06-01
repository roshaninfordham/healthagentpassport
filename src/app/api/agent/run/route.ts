import { z } from "zod";
import {
  runSketchyScraperAgent,
  runTrustedCareAgent
} from "@/lib/agent-runner";

export const runtime = "nodejs";

const schema = z.object({
  scenario: z.enum(["trusted", "sketchy"])
});

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return Response.json({ error: "Invalid scenario." }, { status: 400 });
  }

  const result =
    parsed.data.scenario === "trusted"
      ? await runTrustedCareAgent()
      : await runSketchyScraperAgent();

  return Response.json(result);
}

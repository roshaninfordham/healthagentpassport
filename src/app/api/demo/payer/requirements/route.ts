import { z } from "zod";
import {
  demoError,
  demoJson,
  getSyntheticPayerRequirements
} from "@/lib/internal-demo-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requirementsSchema = z.object({
  payerId: z.string().optional(),
  memberId: z.string().optional(),
  serviceCode: z.string().optional(),
  diagnosisCodes: z.array(z.string()).optional()
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = requirementsSchema.safeParse(json);

    if (!parsed.success) {
      return demoJson(
        {
          error: "Invalid synthetic payer requirements request.",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    return demoJson(getSyntheticPayerRequirements(parsed.data));
  } catch (error) {
    return demoError(error);
  }
}

import { z } from "zod";
import {
  demoError,
  demoJson,
  submitSyntheticPriorAuthPackage
} from "@/lib/internal-demo-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const submissionSchema = z.object({
  caseId: z.string().optional(),
  patientId: z.string().optional(),
  providerNpi: z.string().optional(),
  serviceCode: z.string().optional(),
  evidence: z.array(z.unknown()).optional()
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = submissionSchema.safeParse(json);

    if (!parsed.success) {
      return demoJson(
        {
          error: "Invalid synthetic payer submission request.",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    return demoJson(submitSyntheticPriorAuthPackage(parsed.data));
  } catch (error) {
    return demoError(error);
  }
}

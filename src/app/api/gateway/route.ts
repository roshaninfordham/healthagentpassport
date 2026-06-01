import { z } from "zod";
import { handleGatewayRequest } from "@/lib/gateway";

export const runtime = "nodejs";

const schema = z.object({
  method: z.enum(["GET", "POST"]),
  path: z.string().min(1),
  body: z.unknown().optional(),
  headers: z.object({
    "x-agent-id": z.string().optional(),
    "x-agent-timestamp": z.string().optional(),
    "x-agent-nonce": z.string().optional(),
    "x-agent-signature": z.string().optional()
  })
});

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid gateway request.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const result = await handleGatewayRequest(parsed.data);
  return Response.json(result, { status: result.httpStatus });
}

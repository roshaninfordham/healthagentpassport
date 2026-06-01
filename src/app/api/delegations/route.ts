import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const patient = await prisma.patient.findUnique({
    where: { id: "maya-001" }
  });
  const delegation = await prisma.delegation.findFirst({
    where: {
      patientId: "maya-001",
      agentId: "trusted-care-agent",
      status: "active"
    },
    orderBy: { createdAt: "desc" }
  });

  return Response.json({
    patient,
    delegation: delegation
      ? {
          ...delegation,
          scopes: JSON.parse(delegation.scopesJson) as string[]
        }
      : null
  });
}

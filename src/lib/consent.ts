import { prisma } from "./prisma";

export type ConsentCheck = {
  valid: boolean;
  reason: string;
  delegationHash?: string;
  grantedScopes: string[];
};

export async function checkDelegation(input: {
  patientId: string;
  agentId: string;
  requiredScopes: string[];
}): Promise<ConsentCheck> {
  const delegation = await prisma.delegation.findFirst({
    where: {
      patientId: input.patientId,
      agentId: input.agentId,
      status: "active",
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!delegation) {
    return {
      valid: false,
      reason: "No active patient delegation found.",
      grantedScopes: []
    };
  }

  const grantedScopes = JSON.parse(delegation.scopesJson) as string[];
  const missingScopes = input.requiredScopes.filter(
    (scope) => !grantedScopes.includes(scope)
  );

  if (missingScopes.length > 0) {
    return {
      valid: false,
      reason: `Missing required scopes: ${missingScopes.join(", ")}`,
      delegationHash: delegation.delegationHash,
      grantedScopes
    };
  }

  return {
    valid: true,
    reason: "Active delegation includes all required scopes.",
    delegationHash: delegation.delegationHash,
    grantedScopes
  };
}

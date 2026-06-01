import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export type DelegationFile = {
  patientId: string;
  agentId: string;
  scopes: string[];
  purpose: string;
  expiresAt: string;
  status: string;
  delegationHash: string;
  solanaSignature?: string;
};

export type DelegationCheck = {
  valid: boolean;
  patientId?: string;
  delegationHash?: string;
  grantedScopes: string[];
  missingScopes: string[];
  reason: string;
};

export async function checkDelegation(input: {
  baseDir: string;
  patientId?: string;
  agentId: string;
  requiredScopes: string[];
}): Promise<DelegationCheck> {
  if (!input.patientId) {
    return {
      valid: false,
      grantedScopes: [],
      missingScopes: input.requiredScopes,
      reason: "Patient context is missing."
    };
  }

  const delegationDir = resolve(input.baseDir, ".hap/delegations");
  let files: string[] = [];

  try {
    files = await readdir(delegationDir);
  } catch {
    return {
      valid: false,
      patientId: input.patientId,
      grantedScopes: [],
      missingScopes: input.requiredScopes,
      reason: "No delegation directory found."
    };
  }

  for (const file of files.filter((item) => item.endsWith(".json"))) {
    const delegation = JSON.parse(
      await readFile(join(delegationDir, file), "utf8")
    ) as DelegationFile;

    if (
      delegation.patientId !== input.patientId ||
      delegation.agentId !== input.agentId ||
      delegation.status !== "active" ||
      Date.parse(delegation.expiresAt) <= Date.now()
    ) {
      continue;
    }

    const grantedScopes = delegation.scopes;
    const missingScopes = input.requiredScopes.filter(
      (scope) => !grantedScopes.includes(scope)
    );

    return {
      valid: missingScopes.length === 0,
      patientId: input.patientId,
      delegationHash: delegation.delegationHash,
      grantedScopes,
      missingScopes,
      reason:
        missingScopes.length === 0
          ? "Active patient delegation grants all required scopes."
          : "Delegation is active but missing required scopes."
    };
  }

  return {
    valid: false,
    patientId: input.patientId,
    grantedScopes: [],
    missingScopes: input.requiredScopes,
    reason: "No active patient delegation found for this agent."
  };
}

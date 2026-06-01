import { readFile } from "node:fs/promises";

export type PriorAuthAgent = {
  id: string;
  name: string;
  publicKeyPem: string;
  privateKeyPem?: string;
  scopes: string[];
};

export async function loadAgent(path: string) {
  return JSON.parse(await readFile(path, "utf8")) as PriorAuthAgent;
}

export function verifyAgentScope(input: {
  agent: PriorAuthAgent;
  requiredScopes: string[];
}) {
  const missingScopes = input.requiredScopes.filter(
    (scope) => !input.agent.scopes.includes(scope)
  );

  return {
    valid: missingScopes.length === 0,
    grantedScopes: input.agent.scopes,
    missingScopes
  };
}

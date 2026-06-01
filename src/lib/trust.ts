import type { AgentIdentity } from "@prisma/client";
import type { SandboxReport } from "./sandbox/sandbox-types";
import { routeFromScore, tierFromScore } from "./policy";
import { getValironRoute } from "./valiron";

export type TrustRoute =
  | "prod"
  | "prod_throttled"
  | "sandbox"
  | "sandbox_only";

export type TrustProfile = {
  agentId: string;
  trustScore: number;
  tier: string;
  route: TrustRoute;
  source: "mock" | "valiron";
  signals: {
    identityScore: number;
    onChainScore: number;
    behaviorScore: number;
    complianceScore: number;
    delegationScore: number;
    sandboxRiskScore?: number;
  };
  explanation: string[];
};

export async function evaluateTrust(input: {
  agent: AgentIdentity;
  signatureValid: boolean;
  delegationValid: boolean;
  sandboxReport?: SandboxReport;
}): Promise<TrustProfile> {
  const identityScore = input.signatureValid ? input.agent.identityScore : 0;
  const delegationScore = input.delegationValid ? 100 : 0;
  const sandboxBehaviorScore =
    input.sandboxReport && Number.isFinite(input.sandboxReport.riskScore)
      ? 100 - input.sandboxReport.riskScore
      : undefined;
  const effectiveBehaviorScore =
    sandboxBehaviorScore === undefined
      ? input.agent.behaviorScore
      : Math.min(input.agent.behaviorScore, sandboxBehaviorScore);

  const score = Math.round(
    0.2 * identityScore +
      0.25 * input.agent.onChainScore +
      0.2 * effectiveBehaviorScore +
      0.15 * input.agent.complianceScore +
      0.2 * delegationScore
  );

  let route = routeFromScore(score);
  let source: "mock" | "valiron" = "mock";

  if (process.env.VALIRON_MODE === "live" && input.agent.valironAgentId) {
    const valironRoute = await getValironRoute(input.agent.valironAgentId);
    if (valironRoute) {
      route = valironRoute;
      source = "valiron";
    }
  }

  if (input.sandboxReport?.routeImpact === "downgrade_to_sandbox_only") {
    route = "sandbox_only";
  } else if (
    input.sandboxReport?.routeImpact === "downgrade_to_sandbox" &&
    route === "prod"
  ) {
    route = "sandbox";
  }

  const tier = tierFromScore(score);
  const explanation: string[] = [
    input.signatureValid
      ? "Agent signature verified."
      : "Agent signature invalid.",
    input.delegationValid
      ? "Patient delegation valid."
      : "Patient delegation missing or insufficient.",
    `Computed trust score ${score}/100.`
  ];

  if (input.sandboxReport) {
    explanation.push(
      `Behavioral sandbox verdict ${input.sandboxReport.verdict} with risk ${input.sandboxReport.riskScore}/100.`
    );
  }

  explanation.push(`Route decision: ${route}.`);

  return {
    agentId: input.agent.id,
    trustScore: score,
    tier,
    route,
    source,
    signals: {
      identityScore,
      onChainScore: input.agent.onChainScore,
      behaviorScore: effectiveBehaviorScore,
      complianceScore: input.agent.complianceScore,
      delegationScore,
      sandboxRiskScore: input.sandboxReport?.riskScore
    },
    explanation
  };
}

export function updateBehaviorScore(
  oldScore: number,
  latestOutcome: number
): number {
  const alpha = 0.2;
  return Math.round(alpha * latestOutcome + (1 - alpha) * oldScore);
}

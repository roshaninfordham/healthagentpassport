import type { AgentKeyFile, SandboxDecision, TrustRoute } from "./types.js";

export function routeFromScore(score: number): TrustRoute {
  if (score >= 85) return "prod";
  if (score >= 70) return "prod_throttled";
  if (score >= 50) return "sandbox";
  return "sandbox_only";
}

export function tierFromScore(score: number): string {
  if (score >= 95) return "AAA";
  if (score >= 90) return "AA";
  if (score >= 85) return "A";
  if (score >= 75) return "BAA";
  if (score >= 65) return "BA";
  if (score >= 50) return "B";
  if (score >= 35) return "CAA";
  if (score >= 20) return "CA";
  return "C";
}

export function evaluateTrust(input: {
  agent: AgentKeyFile;
  signatureValid: boolean;
  delegationValid: boolean;
  sandbox: SandboxDecision;
}) {
  const scores = input.agent.trust ?? {};
  const identityScore = input.signatureValid ? (scores.identityScore ?? 80) : 0;
  const onChainScore = scores.onChainScore ?? 50;
  const behaviorScore = Math.min(
    scores.behaviorScore ?? 50,
    100 - input.sandbox.riskScore
  );
  const complianceScore = scores.complianceScore ?? 50;
  const delegationScore = input.delegationValid ? 100 : 0;

  const score = Math.round(
    0.2 * identityScore +
      0.25 * onChainScore +
      0.2 * behaviorScore +
      0.15 * complianceScore +
      0.2 * delegationScore
  );

  let route = routeFromScore(score);

  if (input.sandbox.verdict === "block") {
    route = "sandbox_only";
  } else if (input.sandbox.verdict === "suspicious" && route === "prod") {
    route = "sandbox";
  }

  return {
    score,
    tier: tierFromScore(score),
    route,
    signals: {
      identityScore,
      onChainScore,
      behaviorScore,
      complianceScore,
      delegationScore,
      sandboxRiskScore: input.sandbox.riskScore
    }
  };
}

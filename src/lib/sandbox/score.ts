import type { SandboxObservedEvent, SandboxReport } from "./sandbox-types";

const weights: Record<string, number> = {
  http_request: 2,
  bulk_endpoint_attempt: 40,
  secret_access_attempt: 25,
  filesystem_probe: 15,
  outbound_network_attempt: 25,
  shell_command_attempt: 30,
  package_install_attempt: 20
};

const riskMultiplier = {
  low: 1,
  medium: 1.5,
  high: 2,
  critical: 2.5
} as const;

export function scoreSandboxEvents(events: SandboxObservedEvent[]): number {
  const raw = events.reduce((sum, event) => {
    const base = weights[event.type] ?? 10;
    const multiplier = riskMultiplier[event.risk] ?? 1;
    return sum + base * multiplier;
  }, 0);

  return Math.min(100, Math.round(raw));
}

export function verdictFromRiskScore(
  score: number
): SandboxReport["verdict"] {
  if (score >= 80) return "block";
  if (score >= 50) return "suspicious";
  if (score >= 20) return "watch";
  return "clean";
}

export function routeImpactFromVerdict(
  verdict: SandboxReport["verdict"]
): SandboxReport["routeImpact"] {
  if (verdict === "block") return "downgrade_to_sandbox_only";
  if (verdict === "suspicious") return "downgrade_to_sandbox";
  return "no_change";
}

export function signalsFromEvents(events: SandboxObservedEvent[]): string[] {
  return events.map((event) => {
    if (event.type === "bulk_endpoint_attempt") {
      return `Attempted bulk endpoint access: ${event.target}`;
    }

    if (event.type === "secret_access_attempt") {
      return `Attempted secret access: ${event.target}`;
    }

    if (event.type === "filesystem_probe") {
      return `Probed filesystem path: ${event.target}`;
    }

    if (event.type === "outbound_network_attempt") {
      return `Attempted outbound network call: ${event.target}`;
    }

    if (event.type === "http_request") {
      return `Scoped API request observed: ${event.target}`;
    }

    return `Observed ${event.type}: ${event.target}`;
  });
}

"use client";

import { Braces } from "lucide-react";
import type { GatewayDecisionEvent, RunEvent } from "@/lib/live-events";

const functionNames: Record<string, string> = {
  verify_agent_identity: "verifyAgentSignature()",
  check_nonce_replay: "checkNonceReplay()",
  run_behavioral_sandbox: "runBehavioralSandbox()",
  load_patient_delegation: "loadDelegation()",
  check_required_scopes: "matchScopes()",
  compute_trust_score: "evaluateTrust()",
  create_payment_receipt: "createPaymentReceipt()",
  fetch_upstream_api: "fetchUpstream()",
  write_audit_event: "writeAuditEvent()"
};

type Props = {
  events: RunEvent[];
  decisions: GatewayDecisionEvent[];
};

export function ToolCallsPanel({ events, decisions }: Props) {
  const calls = events
    .filter((event) => event.status === "passed" && functionNames[event.phase])
    .map((event) => ({
      id: event.id,
      label: functionNames[event.phase],
      detail: event.label
    }));
  const latestDecision = decisions[decisions.length - 1];

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-violet-200">
            Tool calls
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Gateway internals
          </h2>
        </div>
        <Braces className="h-5 w-5 text-violet-200" />
      </div>

      <div className="space-y-2">
        {calls.length === 0 ? (
          <p className="rounded-md border border-white/10 bg-white/[0.035] p-4 text-sm text-slate-400">
            Tool calls appear as the gateway evaluates a request.
          </p>
        ) : (
          calls.slice(-12).map((call) => (
            <div
              key={call.id}
              className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2"
            >
              <p className="font-mono text-xs text-cyan-100">{call.label}</p>
              <p className="mt-1 text-xs text-slate-400">{call.detail}</p>
            </div>
          ))
        )}
      </div>

      {latestDecision ? (
        <div className="mt-4 rounded-md border border-white/10 bg-black/25 p-3">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Latest route
          </p>
          <p className="mt-1 font-mono text-sm text-slate-100">
            {latestDecision.trust.route} / {latestDecision.trust.score}
          </p>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node
} from "reactflow";
import { motion } from "framer-motion";
import type { DemoResultView } from "@/lib/client-types";
import { cn } from "@/lib/utils";

type Props = {
  result: DemoResultView | null;
  loading: "trusted" | "sketchy" | null;
};

const proOptions = { hideAttribution: true };

function nodeLabel(title: string, status: string, tone: string) {
  return (
    <div className="min-w-[148px] px-3 py-2">
      <div className="text-[11px] uppercase text-slate-400">{status}</div>
      <div className={cn("mt-1 text-sm font-semibold", tone)}>{title}</div>
    </div>
  );
}

export function FlowMap({ result, loading }: Props) {
  const finalCall = result?.calls[result.calls.length - 1];
  const firstCall = result?.calls[0];
  const trust = finalCall?.trust ?? firstCall?.trust;
  const trustRoute = trust?.route;
  const isTrusted = result?.agentId === "trusted-care-agent";
  const isSketchy = result?.agentId === "sketchy-scraper-agent";
  const isRunning = loading !== null;

  const nodes = useMemo<Node[]>(() => {
    const ok = "text-emerald-200";
    const bad = "text-rose-200";
    const idle = "text-slate-200";
    const warn = "text-amber-200";
    const sandbox = result?.sandboxReport;

    return [
      {
        id: "agent",
        position: { x: 0, y: 96 },
        data: {
          label: nodeLabel(
            isTrusted
              ? "TrustedCareAgent"
              : isSketchy
                ? "SketchyScraperAgent"
                : "AI Agent",
            isRunning ? "active" : result ? "complete" : "ready",
            isSketchy ? bad : isTrusted ? ok : idle
          )
        }
      },
      {
        id: "identity",
        position: { x: 210, y: 30 },
        data: {
          label: nodeLabel(
            "Identity",
            result ? "signature verified" : "public key check",
            result ? ok : idle
          )
        }
      },
      {
        id: "replay",
        position: { x: 210, y: 160 },
        data: {
          label: nodeLabel(
            "Replay Protection",
            result ? "nonce fresh" : "timestamp + nonce",
            result ? ok : idle
          )
        }
      },
      {
        id: "sandbox",
        position: { x: 430, y: 30 },
        data: {
          label: nodeLabel(
            "Behavior Sandbox",
            sandbox ? `${sandbox.verdict} risk ${sandbox.riskScore}` : "mock/gVisor",
            sandbox?.verdict === "block" ? bad : sandbox ? ok : idle
          )
        }
      },
      {
        id: "consent",
        position: { x: 430, y: 160 },
        data: {
          label: nodeLabel(
            "Patient Consent",
            isSketchy ? "missing" : result ? "scopes valid" : "delegation",
            isSketchy ? bad : result ? ok : idle
          )
        }
      },
      {
        id: "trust",
        position: { x: 650, y: 96 },
        data: {
          label: nodeLabel(
            "Trust Route",
            trustRoute ?? "not evaluated",
            trustRoute === "prod" ? ok : trust ? bad : idle
          )
        }
      },
      {
        id: "api",
        position: { x: 870, y: 30 },
        data: {
          label: nodeLabel(
            "Protected API",
            finalCall?.allowed ? "called" : isSketchy ? "blocked" : "guarded",
            finalCall?.allowed ? ok : isSketchy ? bad : idle
          )
        }
      },
      {
        id: "audit",
        position: { x: 870, y: 160 },
        data: {
          label: nodeLabel(
            "Audit Ledger",
            result ? "event written" : "waiting",
            result ? warn : idle
          )
        }
      }
    ];
  }, [finalCall?.allowed, isRunning, isSketchy, isTrusted, result, trust, trustRoute]);

  const edges = useMemo<Edge[]>(
    () => [
      { id: "a-i", source: "agent", target: "identity", animated: isRunning },
      { id: "a-r", source: "agent", target: "replay", animated: isRunning },
      { id: "i-s", source: "identity", target: "sandbox", animated: isRunning },
      { id: "r-c", source: "replay", target: "consent", animated: isRunning },
      { id: "s-t", source: "sandbox", target: "trust", animated: isRunning },
      { id: "c-t", source: "consent", target: "trust", animated: isRunning },
      { id: "t-api", source: "trust", target: "api", animated: isRunning },
      { id: "t-audit", source: "trust", target: "audit", animated: isRunning }
    ],
    [isRunning]
  );

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-cyan-200">
            Live trust flow
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Agent Gate Sequence
          </h2>
        </div>
        <motion.span
          animate={{ opacity: isRunning ? [0.4, 1, 0.4] : 1 }}
          transition={{ duration: 1.4, repeat: isRunning ? Infinity : 0 }}
          className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300"
        >
          {loading ? `${loading} run active` : "ready"}
        </motion.span>
      </div>

      <div className="h-[318px] overflow-hidden rounded-md border border-white/10">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={proOptions}
        >
          <Background color="rgba(255,255,255,0.14)" gap={18} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </section>
  );
}

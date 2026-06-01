"use client";

import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { cn, routeTone } from "@/lib/utils";

type Props = {
  score?: number;
  tier?: string;
  route?: string;
};

export function TrustGauge({ score = 0, tier = "C", route = "pending" }: Props) {
  const color =
    score >= 85 ? "#34d399" : score >= 50 ? "#22d3ee" : score >= 35 ? "#f59e0b" : "#fb7185";

  return (
    <div className="flex min-h-[156px] items-center gap-4">
      <div className="h-36 w-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="70%"
            outerRadius="96%"
            data={[{ name: "Trust", value: Math.max(0, Math.min(100, score)), fill: color }]}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar dataKey="value" cornerRadius={8} background />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-400">Trust score</p>
        <div className="mt-1 flex items-end gap-1">
          <span className="text-4xl font-semibold text-white">{score}</span>
          <span className="pb-1 text-sm text-slate-400">/100</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-200">
            Tier {tier}
          </span>
          <span className={cn("rounded-md border px-2.5 py-1 text-xs", routeTone(route))}>
            {route}
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Code2, TerminalSquare } from "lucide-react";

const commands = [
  {
    title: "Initialize",
    code: "npx priorauth-passport init"
  },
  {
    title: "Start services",
    code: "pnpm demo"
  },
  {
    title: "Submit from CLI",
    code:
      "pnpm priorauth submit --case pa-case-001 --patient maya-001 --service 93306 --payer demo-health-plan"
  },
  {
    title: "Check local health",
    code: "pnpm run doctor"
  }
];

const sdkExample = `import { runPriorAuthWorkflow } from "@priorauth/passport";

const result = await runPriorAuthWorkflow({
  caseId: "pa-case-001",
  patientId: "maya-001",
  serviceCode: "93306",
  payerId: "demo-health-plan"
});

console.log(result.roi.transactionCostSavingsUsd);`;

export function DeveloperModePanel() {
  return (
    <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="glass-panel rounded-lg p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <TerminalSquare className="h-5 w-5 text-emerald-300" />
          Developer quickstart
        </div>
        <div className="mt-4 grid gap-3">
          {commands.map((command) => (
            <div
              key={command.title}
              className="rounded-lg border border-white/10 bg-black/20"
            >
              <div className="border-b border-white/10 px-4 py-2 text-xs uppercase text-slate-400">
                {command.title}
              </div>
              <pre className="overflow-auto px-4 py-3 text-xs leading-5 text-cyan-100">
                {command.code}
              </pre>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-lg p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Code2 className="h-5 w-5 text-cyan-300" />
          SDK shape
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          The package exposes the same workflow primitives used by Studio:
          requirement discovery, evidence matching, package building, ROI, and
          audit evidence.
        </p>
        <pre className="mt-4 max-h-[430px] overflow-auto rounded-lg border border-white/10 bg-black/25 p-4 text-xs leading-5 text-slate-200">
          {sdkExample}
        </pre>
      </div>
    </section>
  );
}

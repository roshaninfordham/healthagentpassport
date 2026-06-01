import { Code2, Copy, ServerCog, TerminalSquare } from "lucide-react";

const commands = [
  {
    label: "1. Start the product demo",
    value: "pnpm demo"
  },
  {
    label: "2. Or protect any local health API",
    value:
      "npx healthagent gateway --policy ./healthagent.yaml --upstream http://localhost:4001 --port 8787"
  },
  {
    label: "3. Send signed agent traffic",
    value:
      "npx healthagent agent run trusted --gateway http://localhost:8787\nnpx healthagent agent run attack --gateway http://localhost:8787"
  }
];

export function DeveloperQuickstartPanel() {
  return (
    <section className="glass-panel rounded-lg p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase text-cyan-200">
            Developer product
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-white">
            Protect a health API in 5 minutes
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            This is the control plane for an installable gateway. Start your
            health API, put HealthAgent Passport in front of it, point agents at
            the gateway, and watch every decision stream into Studio.
          </p>
        </div>
        <div className="grid gap-2 text-sm text-slate-200 sm:grid-cols-3 lg:min-w-[520px]">
          <div className="rounded-md border border-cyan-400/25 bg-cyan-400/10 p-3">
            <ServerCog className="mb-2 h-4 w-4 text-cyan-200" />
            API developers
          </div>
          <div className="rounded-md border border-emerald-400/25 bg-emerald-400/10 p-3">
            <TerminalSquare className="mb-2 h-4 w-4 text-emerald-200" />
            Security teams
          </div>
          <div className="rounded-md border border-amber-400/25 bg-amber-400/10 p-3">
            <Code2 className="mb-2 h-4 w-4 text-amber-200" />
            Agent builders
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {commands.map((command) => (
          <div
            key={command.label}
            className="rounded-md border border-white/10 bg-white/[0.035] p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-100">
                {command.label}
              </p>
              <Copy className="h-4 w-4 text-slate-500" />
            </div>
            <pre className="whitespace-pre-wrap break-words rounded-md border border-white/10 bg-black/30 p-3 font-mono text-xs leading-5 text-cyan-100">
              {command.value}
            </pre>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-md border border-white/10 bg-white/[0.035] p-4">
        <p className="mb-3 text-sm font-semibold text-slate-100">
          SDK integration
        </p>
        <pre className="overflow-x-auto rounded-md border border-white/10 bg-black/30 p-3 font-mono text-xs leading-5 text-slate-200">
{`import { createGateway } from "@healthagent/passport";

const gateway = createGateway({
  policyFile: "./healthagent.yaml",
  upstream: "http://localhost:4001",
  studio: "http://localhost:3000",
  demoDelayMs: 650
});

gateway.listen(8787);`}
        </pre>
      </div>
    </section>
  );
}

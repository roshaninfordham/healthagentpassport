import { LockKeyhole, ReceiptText, ServerCog } from "lucide-react";

const endpoints = [
  {
    method: "GET",
    path: "/fhir/patient/maya-001",
    scope: "patient/*.read"
  },
  {
    method: "POST",
    path: "/prior-auth",
    scope: "payer/PriorAuth.write"
  },
  {
    method: "GET",
    path: "/fhir/all?dump=true",
    scope: "blocked"
  }
];

export function ProtectedApiCard() {
  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-emerald-200">
            Protected APIs
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            FHIR + Prior Auth
          </h2>
        </div>
        <div className="rounded-md border border-emerald-400/30 bg-emerald-400/10 p-2 text-emerald-200">
          <LockKeyhole className="h-5 w-5" />
        </div>
      </div>

      <div className="grid gap-3">
        {endpoints.map((endpoint) => (
          <div
            key={`${endpoint.method}-${endpoint.path}`}
            className="border-b border-white/10 pb-3 last:border-0 last:pb-0"
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-xs text-slate-200">
                {endpoint.method}
              </span>
              <div className="min-w-0">
                <p className="break-words font-mono text-sm text-white">
                  {endpoint.path}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Scope: {endpoint.scope}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <ServerCog className="h-4 w-4 text-cyan-300" />
          Gateway-only upstream access
        </div>
        <div className="flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-amber-300" />
          Mock x402/MPP-compatible receipt
        </div>
      </div>
    </section>
  );
}

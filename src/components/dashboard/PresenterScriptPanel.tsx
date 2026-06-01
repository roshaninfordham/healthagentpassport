import { ChevronDown, Handshake } from "lucide-react";

const script = [
  "I am a health API developer with a synthetic FHIR API on port 4001.",
  "I do not want unknown AI agents calling it directly.",
  "I start HealthAgent Passport as a gateway on port 8787.",
  "Agents call the gateway instead of the API.",
  "TrustedCareAgent signs its request and has patient-scoped consent.",
  "The gateway verifies identity, sandbox behavior, consent, scopes, trust, payment, and audit.",
  "The trusted request is forwarded to the real upstream API.",
  "SketchyScraperAgent attempts a bulk dump.",
  "The gateway blocks it before upstream.",
  "This is the agent firewall for healthcare APIs."
];

const sponsorSignals = [
  "Valiron: trust route + paid API wrapper integration point",
  "Superteam: consent hashes and machine-payment rails without PHI on-chain",
  "Bonfire: national-interest healthcare API security for agentic infrastructure",
  "hw.cafe: builder-ready developer tool with live demo and install path"
];

export function PresenterScriptPanel() {
  return (
    <details className="glass-panel rounded-lg p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-slate-300">
            Presenter script
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Demo story built into the product
          </h2>
        </div>
        <ChevronDown className="h-5 w-5 text-slate-400" />
      </summary>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <ol className="space-y-2 text-sm leading-6 text-slate-300">
          {script.map((line, index) => (
            <li key={line} className="flex gap-3">
              <span className="font-mono text-xs text-cyan-200">
                {index + 1}.
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ol>

        <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Handshake className="h-4 w-4 text-emerald-200" />
            Why sponsors care
          </div>
          <div className="space-y-2">
            {sponsorSignals.map((signal) => (
              <p key={signal} className="text-sm leading-6 text-slate-300">
                {signal}
              </p>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}

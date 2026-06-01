"use client";

import { motion } from "framer-motion";

type Scenario = "complete" | "incomplete";

type Props = {
  loading: Scenario | null;
  onRun: (scenario: Scenario) => void;
  onDeveloperMode: () => void;
};

const coreCards = [
  {
    icon: "❌",
    label: "THE PROBLEM",
    title: "Manual Bottlenecks",
    bullets: ["Clinics copy, paste, and fax.", "Care stalls waiting for permission."],
    className: "border-rose-400/25 bg-rose-400/10"
  },
  {
    icon: "✅",
    label: "THE SOLUTION",
    title: "Automated Agent",
    bullets: [
      "Assembles clinical evidence packages.",
      "Routes instantly through secure APIs."
    ],
    className: "border-emerald-400/25 bg-emerald-400/10"
  },
  {
    icon: "📈",
    label: "THE IMPACT",
    title: "Quantifiable Savings",
    bullets: ["Cuts processing costs by 47%.", "Reclaims 14 minutes per submission."],
    className: "border-cyan-400/25 bg-cyan-400/10"
  }
];

const apiCalls = [
  "GET /fhir/Patient/maya-001",
  "POST /prior-auth/requirements",
  "POST /prior-auth/submit"
];

const cardClass =
  "min-h-min overflow-hidden break-words rounded-lg border p-4 sm:p-5";

export function LandingPageExplainer({
  loading,
  onRun,
  onDeveloperMode
}: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="grid min-h-min gap-5 overflow-hidden break-words rounded-lg border border-white/10 bg-[#070a12] bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[length:44px_44px] p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8"
    >
      <div className="grid min-h-min gap-6 overflow-hidden">
        <div className="flex min-h-min flex-wrap gap-2 overflow-hidden">
          <span className="min-h-min overflow-hidden break-words rounded-md border border-emerald-400/35 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold uppercase text-emerald-50">
            <span className="mr-1.5">🟢</span>
            Synthetic Data Only
          </span>
          <span className="min-h-min overflow-hidden break-words rounded-md border border-cyan-400/35 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold uppercase text-cyan-50">
            <span className="mr-1.5">⚡</span>
            Real EHR + Payer APIs
          </span>
        </div>

        <header className="grid min-h-min gap-4 overflow-hidden">
          <div className="grid min-h-min gap-2 overflow-hidden">
            <h1 className="min-h-min overflow-hidden break-words text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              PriorAuth Passport
            </h1>
            <p className="min-h-min overflow-hidden break-words text-lg font-medium text-cyan-100 sm:text-xl">
              AI-powered electronic prior authorization agent.
            </p>
          </div>

          <div className="flex min-h-min flex-wrap gap-3 overflow-hidden">
            <button
              type="button"
              onClick={() => onRun("complete")}
              disabled={loading !== null}
              className="inline-flex min-h-11 min-w-0 items-center justify-center overflow-hidden break-words rounded-md border border-emerald-400/40 bg-emerald-400/15 px-4 py-2.5 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="mr-1.5">⚡</span>
              Start Live Demo
            </button>
            <button
              type="button"
              onClick={onDeveloperMode}
              className="inline-flex min-h-11 min-w-0 items-center justify-center overflow-hidden break-words rounded-md border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
            >
              <span className="mr-1.5">⚙️</span>
              Developer Quickstart
            </button>
          </div>
        </header>

        <section className="grid min-h-min gap-3 overflow-hidden md:grid-cols-3">
          {coreCards.map((card) => (
            <article
              key={card.label}
              className={`${cardClass} ${card.className}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">
                <span className="mr-1.5">{card.icon}</span>
                {card.label}
              </p>
              <h2 className="mt-3 text-xl font-semibold leading-tight text-white">
                {card.title}
              </h2>
              <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-100">
                {card.bullets.map((bullet) => (
                  <li key={bullet} className="min-h-min overflow-hidden break-words">
                    {bullet}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="grid min-h-min gap-3 overflow-hidden md:grid-cols-2">
          <article className={`${cardClass} border-rose-400/20 bg-black/25`}>
            <p className="text-sm font-semibold leading-6 text-white">
              <span className="mr-1.5">🔴</span>
              The Friction: Prior authorization is an insurance permission slip
              slowing care down.
            </p>
          </article>
          <article className={`${cardClass} border-emerald-400/20 bg-black/25`}>
            <p className="text-sm font-semibold leading-6 text-white">
              <span className="mr-1.5">🟢</span>
              The Engine: PriorAuth Passport is an autonomous ePA platform, not
              just an API.
            </p>
          </article>
        </section>
      </div>

      <aside className="grid min-h-min content-start gap-3 overflow-hidden">
        <section className={`${cardClass} border-cyan-400/25 bg-cyan-400/10`}>
          <p className="text-sm font-semibold text-cyan-50">
            Patient Service Request: CPT 93306
          </p>
        </section>

        <section className={`${cardClass} border-white/10 bg-black/35`}>
          <div className="grid gap-2 font-mono text-xs leading-5 text-slate-100">
            {apiCalls.map((call) => (
              <code
                key={call}
                className="min-h-min overflow-hidden break-words rounded-md bg-white/[0.07] px-3 py-2"
              >
                {call}
              </code>
            ))}
          </div>
        </section>

        <section className={`${cardClass} border-amber-400/25 bg-amber-400/10`}>
          <p className="text-5xl font-semibold leading-none text-white">$5.18</p>
          <p className="mt-3 text-sm font-medium text-amber-50">
            Saved per authorization
          </p>
        </section>
      </aside>
    </motion.section>
  );
}

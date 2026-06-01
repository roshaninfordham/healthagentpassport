"use client";

import { AlertTriangle, CheckCircle2, ClipboardCheck } from "lucide-react";
import type { EvidenceResult } from "@priorauth/passport-core";

const fallbackEvidence: EvidenceResult = {
  complete: false,
  matched: [],
  missing: []
};

type Props = {
  evidence?: EvidenceResult;
};

export function PriorAuthEvidenceChecklistPanel({
  evidence = fallbackEvidence
}: Props) {
  const hasEvidence = evidence.matched.length + evidence.missing.length > 0;

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <ClipboardCheck className="h-5 w-5 text-emerald-300" />
        Evidence checklist
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        The agent submits only when required payer evidence is matched. Missing
        evidence saves a draft and stops before payer submission.
      </p>

      <div className="mt-5 grid gap-3">
        {!hasEvidence ? (
          <div className="rounded-lg border border-dashed border-white/15 p-5 text-sm text-slate-400">
            Payer requirements will appear after discovery.
          </div>
        ) : (
          <>
            {evidence.matched.map((item) => (
              <div
                key={item.requirementId}
                className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-3"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                  <CheckCircle2 className="h-4 w-4" />
                  {item.label}
                </div>
                <p className="mt-1 text-xs text-emerald-50/80">
                  Source: {item.source}
                </p>
              </div>
            ))}
            {evidence.missing.map((item) => (
              <div
                key={item.requirementId}
                className="rounded-lg border border-amber-400/25 bg-amber-400/10 p-3"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                  <AlertTriangle className="h-4 w-4" />
                  {item.label}
                </div>
                <p className="mt-1 text-xs text-amber-50/80">
                  Missing from synthetic EHR response.
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}

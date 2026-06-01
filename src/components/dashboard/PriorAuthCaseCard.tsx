"use client";

import { ClipboardList, Hospital, UserRound } from "lucide-react";
import type { PriorAuthCase } from "@priorauth/passport-core";

const fallbackCase: PriorAuthCase = {
  caseId: "pa-case-001",
  patient: {
    id: "maya-001",
    name: "Maya Patel",
    dob: "1978-04-12",
    memberId: "DEMO-MEMBER-8841"
  },
  provider: {
    npi: "1234567890",
    name: "Dr. Sarah Chen",
    organization: "Demo Cardiology Group"
  },
  payer: {
    id: "demo-health-plan",
    name: "Demo Health Plan"
  },
  requestedService: {
    codeSystem: "CPT",
    code: "93306",
    display: "Transthoracic echocardiography",
    serviceCategory: "Cardiology"
  },
  diagnoses: [
    {
      codeSystem: "ICD-10",
      code: "I10",
      display: "Essential hypertension"
    },
    {
      codeSystem: "ICD-10",
      code: "E11.9",
      display: "Type 2 diabetes mellitus"
    }
  ]
};

type Props = {
  priorAuthCase?: PriorAuthCase;
};

export function PriorAuthCaseCard({ priorAuthCase = fallbackCase }: Props) {
  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <ClipboardList className="h-5 w-5 text-cyan-300" />
        Prior-auth intake
      </div>

      <div className="mt-4 grid gap-4">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <UserRound className="h-4 w-4 text-emerald-300" />
            {priorAuthCase.patient.name}
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-400">Case</dt>
              <dd className="font-medium text-white">{priorAuthCase.caseId}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Member</dt>
              <dd className="font-medium text-white">
                {priorAuthCase.patient.memberId}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Hospital className="h-4 w-4 text-amber-300" />
            {priorAuthCase.provider.organization}
          </div>
          <p className="mt-2 text-sm text-slate-300">
            {priorAuthCase.provider.name} / NPI {priorAuthCase.provider.npi}
          </p>
        </div>

        <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-4">
          <p className="text-xs font-medium uppercase text-cyan-100">
            Requested service
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            {priorAuthCase.requestedService.code} -{" "}
            {priorAuthCase.requestedService.display}
          </p>
          <p className="mt-2 text-xs text-cyan-50/80">
            Payer: {priorAuthCase.payer.name}
          </p>
        </div>
      </div>
    </section>
  );
}

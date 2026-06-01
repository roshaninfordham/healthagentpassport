"use client";

import { useEffect, useState } from "react";
import { FileCheck2, KeyRound, Link2, UserRound } from "lucide-react";
import { shortHash } from "@/lib/utils";

type DelegationResponse = {
  patient: {
    id: string;
    displayName: string;
    dateOfBirth: string;
    sex: string;
    syntheticLabel: string;
  } | null;
  delegation: {
    delegationHash: string;
    solanaSignature: string | null;
    expiresAt: string;
    purpose: string;
    scopes: string[];
  } | null;
};

export function PatientPassportCard({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<DelegationResponse | null>(null);

  useEffect(() => {
    let alive = true;

    fetch("/api/delegations")
      .then((response) => response.json())
      .then((json: DelegationResponse) => {
        if (alive) setData(json);
      })
      .catch(() => {
        if (alive) setData({ patient: null, delegation: null });
      });

    return () => {
      alive = false;
    };
  }, [refreshKey]);

  const patient = data?.patient;
  const delegation = data?.delegation;

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-cyan-200">
            Patient Passport
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            {patient?.displayName ?? "Maya Patel"}
          </h2>
        </div>
        <div className="rounded-md border border-cyan-400/30 bg-cyan-400/10 p-2 text-cyan-200">
          <UserRound className="h-5 w-5" />
        </div>
      </div>

      <div className="space-y-3 text-sm text-slate-300">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <span>Date of birth</span>
          <span className="font-medium text-slate-100">
            {patient?.dateOfBirth ?? "1978-04-12"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <span>Data label</span>
          <span className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-100">
            {patient?.syntheticLabel ?? "SYNTHETIC_ONLY"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <span>Delegated agent</span>
          <span className="font-medium text-slate-100">TrustedCareAgent</span>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-100">
          <FileCheck2 className="h-4 w-4 text-emerald-300" />
          Active scopes
        </div>
        <div className="grid gap-2">
          {(delegation?.scopes ?? [
            "patient/Patient.read",
            "patient/Condition.read",
            "patient/MedicationRequest.read",
            "patient/Observation.read",
            "payer/PriorAuth.write"
          ]).map((scope) => (
            <span
              key={scope}
              className="rounded-md border border-white/10 bg-white/[0.035] px-2.5 py-1.5 text-xs text-slate-300"
            >
              {scope}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm">
        <div className="flex items-center gap-2 text-slate-300">
          <KeyRound className="h-4 w-4 text-amber-300" />
          Consent hash
          <span className="ml-auto font-mono text-xs text-slate-100">
            {shortHash(delegation?.delegationHash)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <Link2 className="h-4 w-4 text-cyan-300" />
          Solana anchor
          <span className="ml-auto font-mono text-xs text-slate-100">
            {shortHash(delegation?.solanaSignature)}
          </span>
        </div>
      </div>
    </section>
  );
}

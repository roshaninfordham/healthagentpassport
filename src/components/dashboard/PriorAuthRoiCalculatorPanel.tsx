"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Calculator, ToggleLeft, ToggleRight } from "lucide-react";

type RoiResult = {
  manualProviderCostUsd?: number;
  electronicProviderCostUsd?: number;
  manualTimeMinutes?: number;
  electronicTimeMinutes?: number;
  transactionCostSavingsUsd?: number;
  minutesSavedBaseline?: number;
  bestCaseTimeSavedMinutes?: number;
  laborSavingsBaselineUsd?: number;
  laborSavingsBestCaseUsd?: number;
  platformFeePerAuthorizationUsd?: number;
  netSavingsAfterPlatformFeeUsd?: number;
};

type Props = {
  roi?: unknown;
};

const fallbackRoi: RoiResult = {
  manualProviderCostUsd: 10.97,
  electronicProviderCostUsd: 5.79,
  manualTimeMinutes: 16,
  electronicTimeMinutes: 9,
  transactionCostSavingsUsd: 5.18,
  minutesSavedBaseline: 7,
  bestCaseTimeSavedMinutes: 14,
  laborSavingsBaselineUsd: 4.08,
  laborSavingsBestCaseUsd: 8.17,
  platformFeePerAuthorizationUsd: 1.25,
  netSavingsAfterPlatformFeeUsd: 3.93
};

function money(value = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2
  }).format(value);
}

function number(value = 0) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm">
      <span className="flex items-center justify-between gap-3">
        <span className="text-slate-300">{label}</span>
        <span className="font-semibold text-white">
          {value}
          {suffix ?? ""}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-cyan-300"
      />
    </label>
  );
}

export function PriorAuthRoiCalculatorPanel({ roi }: Props) {
  const [includeLabor, setIncludeLabor] = useState(false);
  const [physicians, setPhysicians] = useState(5);
  const [authsPerPhysician, setAuthsPerPhysician] = useState(39);
  const [staffRate, setStaffRate] = useState(35);
  const [platformFee, setPlatformFee] = useState(1.25);
  const currentRoi = (roi as RoiResult | undefined) ?? fallbackRoi;

  const transactionSavings = currentRoi.transactionCostSavingsUsd ?? 5.18;
  const minutesSaved = currentRoi.minutesSavedBaseline ?? 7;
  const bestCaseMinutes = currentRoi.bestCaseTimeSavedMinutes ?? 14;
  const laborBaseline = (minutesSaved / 60) * staffRate;
  const laborBestCase = (bestCaseMinutes / 60) * staffRate;
  const annualVolume = physicians * authsPerPhysician * 48;
  const annualTransactionSavings = transactionSavings * annualVolume;
  const annualNetTransactionSavings = (transactionSavings - platformFee) * annualVolume;
  const annualBaselineHours = (minutesSaved * annualVolume) / 60;
  const annualBestCaseHours = (bestCaseMinutes * annualVolume) / 60;

  const chartData = useMemo(
    () => [
      {
        name: "Manual",
        cost: currentRoi.manualProviderCostUsd ?? 10.97
      },
      {
        name: "Electronic",
        cost: currentRoi.electronicProviderCostUsd ?? 5.79
      },
      {
        name: "Saved",
        cost: transactionSavings
      }
    ],
    [currentRoi, transactionSavings]
  );

  const totalWithLabor =
    transactionSavings + (includeLabor ? laborBaseline : 0);

  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Calculator className="h-5 w-5 text-cyan-300" />
          ROI calculator
        </div>
        <button
          type="button"
          onClick={() => setIncludeLabor((value) => !value)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.07]"
        >
          {includeLabor ? (
            <ToggleRight className="h-4 w-4 text-emerald-300" />
          ) : (
            <ToggleLeft className="h-4 w-4 text-slate-400" />
          )}
          Labor sensitivity
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-4">
          <p className="text-xs uppercase text-cyan-100">Mode A</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {money(transactionSavings)}
          </p>
          <p className="mt-1 text-xs leading-5 text-cyan-50/80">
            Transaction delta only. This is the default ROI claim.
          </p>
        </div>
        <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p className="text-xs uppercase text-emerald-100">Mode B</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {minutesSaved} min
          </p>
          <p className="mt-1 text-xs leading-5 text-emerald-50/80">
            Baseline staff-time sensitivity, tracked separately.
          </p>
        </div>
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-4">
          <p className="text-xs uppercase text-amber-100">Mode C</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {includeLabor ? money(totalWithLabor) : "Off"}
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-50/80">
            Labor dollars are shown only when toggled.
          </p>
        </div>
      </div>

      <div className="mt-5 h-52 rounded-lg border border-white/10 bg-black/15 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              contentStyle={{
                background: "#070a12",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 8,
                color: "#fff"
              }}
              formatter={(value) => money(Number(value))}
            />
            <Bar dataKey="cost" fill="#22d3ee" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        <Slider
          label="Physicians"
          value={physicians}
          min={1}
          max={25}
          onChange={setPhysicians}
        />
        <Slider
          label="Auths / physician / week"
          value={authsPerPhysician}
          min={1}
          max={80}
          onChange={setAuthsPerPhysician}
        />
        <Slider
          label="Staff hourly rate"
          value={staffRate}
          min={20}
          max={80}
          suffix="/hr"
          onChange={setStaffRate}
        />
        <Slider
          label="Platform fee"
          value={platformFee}
          min={0}
          max={5}
          step={0.25}
          suffix="/auth"
          onChange={setPlatformFee}
        />
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
          <p className="text-slate-400">Annual prior-auth volume</p>
          <p className="mt-1 font-semibold text-white">
            {number(annualVolume)}
          </p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
          <p className="text-slate-400">Annual transaction savings</p>
          <p className="mt-1 font-semibold text-white">
            {money(annualTransactionSavings)}
          </p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
          <p className="text-slate-400">Annual baseline staff time saved</p>
          <p className="mt-1 font-semibold text-white">
            {number(annualBaselineHours)} hours
          </p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
          <p className="text-slate-400">Net transaction savings after fee</p>
          <p className="mt-1 font-semibold text-white">
            {money(annualNetTransactionSavings)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-white/10 bg-black/15 p-3 text-sm leading-6 text-slate-300">
        Labor value: {money(laborBaseline)} for {minutesSaved} min baseline,{" "}
        {money(laborBestCase)} for {bestCaseMinutes} min best case. Annual
        best-case staff time saved: {number(annualBestCaseHours)} hours.
      </div>
    </section>
  );
}

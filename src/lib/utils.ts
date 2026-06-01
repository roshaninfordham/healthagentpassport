import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortHash(value?: string | null, head = 8, tail = 5) {
  if (!value) return "pending";
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export function routeTone(route?: string) {
  if (route === "prod") return "text-emerald-200 border-emerald-400/40 bg-emerald-400/10";
  if (route === "prod_throttled") return "text-amber-200 border-amber-400/40 bg-amber-400/10";
  if (route === "sandbox") return "text-cyan-200 border-cyan-400/40 bg-cyan-400/10";
  return "text-rose-200 border-rose-400/40 bg-rose-400/10";
}

export function decisionTone(decision?: string) {
  if (decision === "allow") return "text-emerald-200 border-emerald-400/40 bg-emerald-400/10";
  if (decision === "throttle") return "text-amber-200 border-amber-400/40 bg-amber-400/10";
  if (decision === "sandbox") return "text-cyan-200 border-cyan-400/40 bg-cyan-400/10";
  return "text-rose-200 border-rose-400/40 bg-rose-400/10";
}

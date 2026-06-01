import { randomUUID } from "node:crypto";
import { sha256Hex, stableJson } from "./crypto.js";

export function createAuditEvent(input: {
  request: unknown;
  response?: unknown;
}) {
  return {
    auditId: randomUUID(),
    requestHash: sha256Hex(stableJson(input.request)),
    responseHash:
      input.response === undefined ? undefined : sha256Hex(stableJson(input.response))
  };
}

export function createPaymentReceipt(input: {
  agentId: string;
  path: string;
}) {
  const receiptId = `mock-mpp-${sha256Hex(`${input.agentId}:${input.path}:${Date.now()}`).slice(0, 20)}`;

  return {
    mode: "mock" as const,
    receiptId,
    costMicros: input.path.startsWith("/prior-auth") ? 2500 : 1200
  };
}

import { createHash, randomUUID } from "node:crypto";

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function sha256Hex(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function createAuditEvent(input: {
  runId: string;
  caseId: string;
  priorAuthId?: string;
  evidence: unknown;
  roi: unknown;
  status: "submitted" | "draft_missing_evidence";
}) {
  return {
    auditId: randomUUID(),
    runId: input.runId,
    caseId: input.caseId,
    priorAuthId: input.priorAuthId,
    status: input.status,
    evidenceHash: sha256Hex(input.evidence),
    roiHash: sha256Hex(input.roi),
    createdAt: new Date().toISOString(),
    syntheticOnly: true
  };
}

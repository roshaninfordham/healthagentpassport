import { readFileSync } from "node:fs";
import { parse } from "yaml";

export function loadPriorAuthPolicy(path = "config/priorauth-policy.yaml") {
  return parse(readFileSync(path, "utf8")) as {
    version: number;
    product: {
      name: string;
      mode: string;
      safety: {
        syntheticOnly: boolean;
        noMedicalAdvice: boolean;
        noTreatmentDecisioning: boolean;
      };
    };
    agent: {
      id: string;
      name: string;
      scopes: string[];
    };
    workflow: {
      defaultCaseId: string;
      ehrBaseUrl: string;
      payerBaseUrl: string;
      demoDelayMs: number;
    };
  };
}

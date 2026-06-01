import type { PriorAuthCase } from "./types";

export const seedPriorAuthCase: PriorAuthCase = {
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
      display: "Type 2 diabetes mellitus without complications"
    }
  ]
};

export function getSeedCase(caseId: string) {
  if (caseId !== seedPriorAuthCase.caseId) {
    throw new Error(`Unknown synthetic prior-auth case ${caseId}.`);
  }

  return seedPriorAuthCase;
}

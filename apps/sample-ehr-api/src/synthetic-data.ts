export const patient = {
  resourceType: "Patient",
  id: "maya-001",
  name: [{ given: ["Maya"], family: "Patel" }],
  gender: "female",
  birthDate: "1978-04-12",
  identifier: [{ system: "demo-member-id", value: "DEMO-MEMBER-8841" }]
};

export const conditions = [
  {
    resourceType: "Condition",
    id: "cond-001",
    subject: { reference: "Patient/maya-001" },
    code: { coding: [{ system: "ICD-10", code: "I10" }], text: "Essential hypertension" }
  },
  {
    resourceType: "Condition",
    id: "cond-002",
    subject: { reference: "Patient/maya-001" },
    code: {
      coding: [{ system: "ICD-10", code: "E11.9" }],
      text: "Type 2 diabetes mellitus without complications"
    }
  }
];

export const medications = [
  {
    resourceType: "MedicationRequest",
    id: "med-001",
    subject: { reference: "Patient/maya-001" },
    medicationCodeableConcept: { text: "Metformin 500mg" },
    status: "active",
    intent: "order"
  }
];

export const observations = [
  {
    resourceType: "Observation",
    id: "obs-bp-001",
    subject: { reference: "Patient/maya-001" },
    code: { text: "Blood pressure" },
    valueString: "142/88",
    effectiveDateTime: "2026-05-20"
  }
];

export const documents = [
  {
    id: "doc-referral-001",
    type: "referral_note",
    title: "Cardiology referral note",
    status: "available"
  },
  {
    id: "doc-echo-history-001",
    type: "prior_test_result",
    title: "Prior ECG result",
    status: "available"
  },
  {
    id: "doc-med-list-001",
    type: "medication_list",
    title: "Active medication list",
    status: "available"
  }
];

export function bundle(resourceType: string, entry: unknown[]) {
  return {
    resourceType: "Bundle",
    type: "searchset",
    total: entry.length,
    entry: entry.map((resource) => ({ resource }))
  };
}

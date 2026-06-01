export const demoPatient = {
  id: "maya-001",
  displayName: "Maya Patel",
  dateOfBirth: "1978-04-12",
  sex: "female",
  syntheticLabel: "SYNTHETIC_ONLY"
};

export const trustedScopes = [
  "patient/Patient.read",
  "patient/Condition.read",
  "patient/MedicationRequest.read",
  "patient/Observation.read",
  "payer/PriorAuth.write"
];

export const demoFhirBundle = {
  resourceType: "Bundle",
  type: "collection",
  entry: [
    {
      resource: {
        resourceType: "Patient",
        id: "maya-001",
        name: [{ given: ["Maya"], family: "Patel" }],
        gender: "female",
        birthDate: "1978-04-12"
      }
    },
    {
      resource: {
        resourceType: "Condition",
        id: "cond-001",
        subject: { reference: "Patient/maya-001" },
        code: { text: "Type 2 diabetes mellitus" },
        clinicalStatus: { text: "active" }
      }
    },
    {
      resource: {
        resourceType: "Condition",
        id: "cond-002",
        subject: { reference: "Patient/maya-001" },
        code: { text: "Hypertension" },
        clinicalStatus: { text: "active" }
      }
    },
    {
      resource: {
        resourceType: "MedicationRequest",
        id: "med-001",
        subject: { reference: "Patient/maya-001" },
        medicationCodeableConcept: { text: "Metformin 500mg" },
        status: "active",
        intent: "order"
      }
    },
    {
      resource: {
        resourceType: "Observation",
        id: "obs-a1c-001",
        subject: { reference: "Patient/maya-001" },
        code: { text: "Hemoglobin A1c" },
        valueQuantity: { value: 7.6, unit: "%" },
        effectiveDateTime: "2026-05-20"
      }
    }
  ]
};

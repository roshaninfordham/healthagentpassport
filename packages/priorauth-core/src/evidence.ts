import type {
  EvidenceMatch,
  EvidenceResult,
  PayerRequirements
} from "./types";

type EvidenceInput = {
  requirements: PayerRequirements;
  conditions: { entry?: Array<{ resource?: { id?: string } }> };
  medications: { entry?: Array<{ resource?: { id?: string } }> };
  observations: { entry?: Array<{ resource?: { id?: string } }> };
  documents: {
    documents?: Array<{
      id: string;
      type: string;
      status: string;
    }>;
  };
};

function findDocument(input: EvidenceInput, type: string) {
  return input.documents.documents?.find(
    (document) => document.type === type && document.status === "available"
  );
}

function firstResourceId(bundle: { entry?: Array<{ resource?: { id?: string } }> }) {
  return bundle.entry?.find((entry) => entry.resource?.id)?.resource?.id;
}

function matchRequirement(
  input: EvidenceInput,
  requirementId: string
): string | null {
  if (requirementId === "referral_note") {
    const document = findDocument(input, "referral_note");
    return document ? `DocumentReference/${document.id}` : null;
  }

  if (requirementId === "recent_vitals_or_observation") {
    const observationId = firstResourceId(input.observations);
    return observationId ? `Observation/${observationId}` : null;
  }

  if (requirementId === "medication_list") {
    const document = findDocument(input, "medication_list");
    const medicationId = firstResourceId(input.medications);
    if (document) return `DocumentReference/${document.id}`;
    return medicationId ? `MedicationRequest/${medicationId}` : null;
  }

  if (requirementId === "diagnosis_list") {
    const conditionIds =
      input.conditions.entry
        ?.map((entry) => entry.resource?.id)
        .filter(Boolean)
        .map((id) => `Condition/${id}`)
        .join(", ") ?? "";

    return conditionIds || null;
  }

  return null;
}

export function matchEvidence(input: EvidenceInput): EvidenceResult {
  const matched: EvidenceMatch[] = [];
  const missing: EvidenceMatch[] = [];

  for (const requirement of input.requirements.requiredEvidence) {
    const source = matchRequirement(input, requirement.id);
    const item: EvidenceMatch = {
      requirementId: requirement.id,
      label: requirement.label,
      status: source ? "matched" : "missing",
      source: source ?? undefined
    };

    if (source) {
      matched.push(item);
    } else {
      missing.push(item);
    }
  }

  return {
    complete: missing.length === 0,
    matched,
    missing
  };
}

export function buildPriorAuthPackage(input: {
  priorAuthCase: {
    caseId: string;
    patient: { id: string };
    provider: { npi: string };
    requestedService: { code: string };
  };
  evidence: EvidenceResult;
}) {
  return {
    caseId: input.priorAuthCase.caseId,
    patientId: input.priorAuthCase.patient.id,
    providerNpi: input.priorAuthCase.provider.npi,
    serviceCode: input.priorAuthCase.requestedService.code,
    evidence: input.evidence.matched.map((match) => match.requirementId)
  };
}

export type PriorAuthScenario = "complete" | "incomplete";

export type PriorAuthCase = {
  caseId: string;
  patient: {
    id: string;
    name: string;
    dob: string;
    memberId: string;
  };
  provider: {
    npi: string;
    name: string;
    organization: string;
  };
  payer: {
    id: string;
    name: string;
  };
  requestedService: {
    codeSystem: "CPT";
    code: string;
    display: string;
    serviceCategory: string;
  };
  diagnoses: Array<{
    codeSystem: "ICD-10";
    code: string;
    display: string;
  }>;
};

export type RequiredEvidence = {
  id: string;
  label: string;
  required: boolean;
};

export type PayerRequirements = {
  requiresPriorAuth: boolean;
  serviceCode: string;
  serviceName: string;
  payer: string;
  requiredEvidence: RequiredEvidence[];
  expectedManualTimeMinutes: number;
  expectedElectronicTimeMinutes: number;
  bestCaseElectronicTimeSavedMinutes: number;
};

export type EvidenceMatch = {
  requirementId: string;
  label: string;
  status: "matched" | "missing";
  source?: string;
};

export type EvidenceResult = {
  complete: boolean;
  matched: EvidenceMatch[];
  missing: EvidenceMatch[];
};

export type RoiInput = {
  manualProviderCostUsd: number;
  electronicProviderCostUsd: number;
  manualTimeMinutes: number;
  electronicTimeMinutes: number;
  bestCaseTimeSavedMinutes: number;
  staffLoadedHourlyRateUsd: number;
  authVolume: number;
  platformFeePerAuthorizationUsd: number;
};

export type PriorAuthRunEvent = {
  id: string;
  runId: string;
  caseId: string;
  timestamp: string;
  phase:
    | "start"
    | "load_case"
    | "verify_agent"
    | "fetch_patient"
    | "fetch_conditions"
    | "fetch_medications"
    | "fetch_observations"
    | "fetch_documents"
    | "discover_payer_requirements"
    | "match_evidence"
    | "build_package"
    | "submit_prior_auth"
    | "calculate_roi"
    | "write_audit"
    | "complete"
    | "blocked";
  label: string;
  status: "queued" | "running" | "passed" | "failed" | "blocked" | "info";
  durationMs?: number;
  details?: Record<string, unknown>;
};

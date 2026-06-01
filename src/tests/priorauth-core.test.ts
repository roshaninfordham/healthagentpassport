import { describe, expect, it } from "vitest";
import {
  calculatePerAuthRoi,
  calculatePracticeRoi,
  matchEvidence,
  type PayerRequirements,
  type RoiInput
} from "@priorauth/passport-core";

const roiInput: RoiInput = {
  manualProviderCostUsd: 10.97,
  electronicProviderCostUsd: 5.79,
  manualTimeMinutes: 16,
  electronicTimeMinutes: 9,
  bestCaseTimeSavedMinutes: 14,
  staffLoadedHourlyRateUsd: 35,
  authVolume: 9360,
  platformFeePerAuthorizationUsd: 1.25
};

const requirements: PayerRequirements = {
  requiresPriorAuth: true,
  serviceCode: "93306",
  serviceName: "Transthoracic echocardiography",
  payer: "Demo Health Plan",
  expectedManualTimeMinutes: 16,
  expectedElectronicTimeMinutes: 9,
  bestCaseElectronicTimeSavedMinutes: 14,
  requiredEvidence: [
    { id: "diagnosis_list", label: "Diagnosis list", required: true },
    { id: "medication_list", label: "Medication list", required: true },
    { id: "recent_vitals_or_observation", label: "Recent observation", required: true },
    { id: "referral_note", label: "Referral note", required: true }
  ]
};

describe("prior-auth ROI", () => {
  it("keeps transaction savings separate from labor sensitivity", () => {
    const roi = calculatePerAuthRoi(roiInput);

    expect(roi.transactionCostSavingsUsd).toBeCloseTo(5.18);
    expect(roi.minutesSavedBaseline).toBe(7);
    expect(roi.laborSavingsBaselineUsd).toBeCloseTo(4.08);
    expect(roi.netSavingsAfterPlatformFeeUsd).toBeCloseTo(3.93);
  });

  it("calculates annual practice impact from configured volume", () => {
    const practice = calculatePracticeRoi(roiInput);

    expect(practice.volume).toBe(9360);
    expect(practice.grossTransactionSavingsUsd).toBeCloseTo(48484.8);
    expect(practice.netTransactionSavingsAfterFeesUsd).toBeCloseTo(36784.8);
  });
});

describe("prior-auth evidence matching", () => {
  it("marks a complete EHR bundle as submission-ready", () => {
    const evidence = matchEvidence({
      requirements,
      conditions: { entry: [{ resource: { id: "condition-1" } }] },
      medications: { entry: [{ resource: { id: "med-1" } }] },
      observations: { entry: [{ resource: { id: "obs-1" } }] },
      documents: {
        documents: [
          { id: "doc-referral", type: "referral_note", status: "available" },
          { id: "doc-meds", type: "medication_list", status: "available" }
        ]
      }
    });

    expect(evidence.complete).toBe(true);
    expect(evidence.missing).toHaveLength(0);
    expect(evidence.matched.map((match) => match.requirementId)).toContain(
      "referral_note"
    );
  });

  it("blocks payer submission when evidence is missing", () => {
    const evidence = matchEvidence({
      requirements,
      conditions: { entry: [{ resource: { id: "condition-1" } }] },
      medications: { entry: [{ resource: { id: "med-1" } }] },
      observations: { entry: [] },
      documents: {
        documents: [{ id: "doc-meds", type: "medication_list", status: "available" }]
      }
    });

    expect(evidence.complete).toBe(false);
    expect(evidence.missing.map((match) => match.requirementId)).toEqual([
      "recent_vitals_or_observation",
      "referral_note"
    ]);
  });
});

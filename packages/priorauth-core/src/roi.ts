import { readFileSync } from "node:fs";
import { parse } from "yaml";
import type { RoiInput } from "./types";

export function calculatePerAuthRoi(input: RoiInput) {
  const transactionCostSavingsUsd =
    input.manualProviderCostUsd - input.electronicProviderCostUsd;

  const minutesSavedBaseline =
    input.manualTimeMinutes - input.electronicTimeMinutes;

  const laborSavingsBaselineUsd =
    (minutesSavedBaseline / 60) * input.staffLoadedHourlyRateUsd;

  const laborSavingsBestCaseUsd =
    (input.bestCaseTimeSavedMinutes / 60) * input.staffLoadedHourlyRateUsd;

  const netSavingsAfterPlatformFeeUsd =
    transactionCostSavingsUsd - input.platformFeePerAuthorizationUsd;

  return {
    manualProviderCostUsd: input.manualProviderCostUsd,
    electronicProviderCostUsd: input.electronicProviderCostUsd,
    manualTimeMinutes: input.manualTimeMinutes,
    electronicTimeMinutes: input.electronicTimeMinutes,
    bestCaseTimeSavedMinutes: input.bestCaseTimeSavedMinutes,
    staffLoadedHourlyRateUsd: input.staffLoadedHourlyRateUsd,
    transactionCostSavingsUsd,
    minutesSavedBaseline,
    laborSavingsBaselineUsd,
    laborSavingsBestCaseUsd,
    platformFeePerAuthorizationUsd: input.platformFeePerAuthorizationUsd,
    netSavingsAfterPlatformFeeUsd
  };
}

export function calculatePracticeRoi(input: RoiInput) {
  const perAuth = calculatePerAuthRoi(input);

  return {
    perAuth,
    volume: input.authVolume,
    grossTransactionSavingsUsd:
      perAuth.transactionCostSavingsUsd * input.authVolume,
    grossBaselineMinutesSaved:
      perAuth.minutesSavedBaseline * input.authVolume,
    grossBestCaseMinutesSaved:
      input.bestCaseTimeSavedMinutes * input.authVolume,
    grossLaborSavingsBaselineUsd:
      perAuth.laborSavingsBaselineUsd * input.authVolume,
    grossLaborSavingsBestCaseUsd:
      perAuth.laborSavingsBestCaseUsd * input.authVolume,
    platformRevenueUsd:
      input.platformFeePerAuthorizationUsd * input.authVolume,
    netTransactionSavingsAfterFeesUsd:
      perAuth.netSavingsAfterPlatformFeeUsd * input.authVolume
  };
}

export function loadRoiConfig(path = "config/roi.yaml") {
  const config = parse(readFileSync(path, "utf8")) as {
    sourceLabel: string;
    priorAuthorization: {
      manualProviderCostUsd: number;
      electronicProviderCostUsd: number;
      manualTimeMinutes: number;
      electronicTimeMinutes: number;
      bestCaseTimeSavedMinutes: number;
      staffLoadedHourlyRateUsd: number;
      industryAnnualSavingsOpportunityUsd: number;
    };
    practice: {
      physicians: number;
      authsPerPhysicianPerWeek: number;
      workingWeeksPerYear: number;
    };
    pricing: {
      platformFeePerAuthorizationUsd: number;
      monthlySubscriptionUsd: number;
    };
  };
  const authVolume =
    config.practice.physicians *
    config.practice.authsPerPhysicianPerWeek *
    config.practice.workingWeeksPerYear;

  return {
    sourceLabel: config.sourceLabel,
    assumptions: config,
    input: {
      manualProviderCostUsd:
        config.priorAuthorization.manualProviderCostUsd,
      electronicProviderCostUsd:
        config.priorAuthorization.electronicProviderCostUsd,
      manualTimeMinutes: config.priorAuthorization.manualTimeMinutes,
      electronicTimeMinutes:
        config.priorAuthorization.electronicTimeMinutes,
      bestCaseTimeSavedMinutes:
        config.priorAuthorization.bestCaseTimeSavedMinutes,
      staffLoadedHourlyRateUsd:
        config.priorAuthorization.staffLoadedHourlyRateUsd,
      authVolume,
      platformFeePerAuthorizationUsd:
        config.pricing.platformFeePerAuthorizationUsd
    } satisfies RoiInput
  };
}

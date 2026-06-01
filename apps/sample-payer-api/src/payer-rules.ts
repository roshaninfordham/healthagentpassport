export const requirements = {
  requiresPriorAuth: true,
  serviceCode: "93306",
  serviceName: "Transthoracic echocardiography",
  payer: "Demo Health Plan",
  requiredEvidence: [
    {
      id: "referral_note",
      label: "Referral note",
      required: true
    },
    {
      id: "recent_vitals_or_observation",
      label: "Recent relevant observation",
      required: true
    },
    {
      id: "medication_list",
      label: "Medication list",
      required: true
    },
    {
      id: "diagnosis_list",
      label: "Diagnosis list",
      required: true
    }
  ],
  expectedManualTimeMinutes: 16,
  expectedElectronicTimeMinutes: 9,
  bestCaseElectronicTimeSavedMinutes: 14
};

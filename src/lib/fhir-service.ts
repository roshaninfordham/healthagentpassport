import { prisma } from "./prisma";

export async function getSyntheticPatientBundle(patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId }
  });

  if (!patient) {
    return {
      status: 404,
      data: { error: "Patient not found." }
    };
  }

  return {
    status: 200,
    data: {
      syntheticOnly: true,
      warning: "Demo data only. Not real PHI. Not medical advice.",
      patientId,
      bundle: JSON.parse(patient.fhirBundleJson)
    }
  };
}

export async function submitPriorAuth(body: unknown) {
  const patientId =
    body && typeof body === "object" && "patientId" in body
      ? String((body as { patientId: unknown }).patientId)
      : "unknown";

  return {
    status: 200,
    data: {
      syntheticOnly: true,
      priorAuthId: `pa-demo-${Date.now()}`,
      patientId,
      status: "package_ready",
      payer: "Demo Health Plan",
      requiredDocuments: [
        "Recent A1C observation",
        "Medication list",
        "Relevant diagnosis list",
        "Specialist referral note"
      ],
      message:
        "Synthetic prior-authorization package assembled. No clinical recommendation generated."
    }
  };
}

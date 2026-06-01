import { PrismaClient } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import {
  calculatePerAuthRoi,
  getSeedCase,
  loadRoiConfig
} from "@priorauth/passport-core";

const prisma = new PrismaClient();

function hash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

async function main() {
  await prisma.priorAuthAuditEvent.deleteMany();
  await prisma.priorAuthRun.deleteMany();
  await prisma.priorAuthCase.deleteMany();

  const demoCase = getSeedCase("pa-case-001");
  const roi = calculatePerAuthRoi(loadRoiConfig().input);
  const evidence = {
    complete: true,
    matched: [
      "diagnosis_list",
      "medication_list",
      "recent_vitals_or_observation",
      "referral_note"
    ],
    missing: []
  };
  const runId = randomUUID();

  await prisma.priorAuthCase.create({
    data: {
      id: demoCase.caseId,
      patientId: demoCase.patient.id,
      patientName: demoCase.patient.name,
      memberId: demoCase.patient.memberId,
      providerNpi: demoCase.provider.npi,
      providerName: demoCase.provider.name,
      payerId: demoCase.payer.id,
      payerName: demoCase.payer.name,
      serviceCode: demoCase.requestedService.code,
      serviceDisplay: demoCase.requestedService.display,
      diagnosisCodesJson: JSON.stringify(
        demoCase.diagnoses.map((diagnosis) => diagnosis.code)
      ),
      status: "ready_for_demo"
    }
  });

  await prisma.priorAuthRun.create({
    data: {
      id: runId,
      caseId: demoCase.caseId,
      scenario: "complete",
      status: "seeded_demo_snapshot",
      eventCount: 15,
      roiJson: JSON.stringify(roi),
      evidenceJson: JSON.stringify(evidence),
      submissionJson: JSON.stringify({
        priorAuthId: "PA-DEMO-SEED",
        decision: "pending_payer_review"
      })
    }
  });

  await prisma.priorAuthAuditEvent.create({
    data: {
      id: randomUUID(),
      runId,
      caseId: demoCase.caseId,
      status: "submitted",
      evidenceHash: hash(evidence),
      roiHash: hash(roi)
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seeded PriorAuth Passport demo data.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

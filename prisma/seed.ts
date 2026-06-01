import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { canonicalJson } from "../src/lib/canonical";
import {
  makeEd25519KeyPair,
  sha256Hex,
  signText
} from "../src/lib/crypto";
import {
  demoFhirBundle,
  demoPatient,
  trustedScopes
} from "../src/lib/demo-data";

const prisma = new PrismaClient();

async function main() {
  await prisma.auditEvent.deleteMany();
  await prisma.sandboxRun.deleteMany();
  await prisma.nonce.deleteMany();
  await prisma.delegation.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.agentIdentity.deleteMany();

  const trustedKeys = makeEd25519KeyPair();
  const sketchyKeys = makeEd25519KeyPair();

  await prisma.patient.create({
    data: {
      id: demoPatient.id,
      displayName: demoPatient.displayName,
      dateOfBirth: demoPatient.dateOfBirth,
      sex: demoPatient.sex,
      syntheticLabel: demoPatient.syntheticLabel,
      fhirBundleJson: JSON.stringify(demoFhirBundle, null, 2)
    }
  });

  await prisma.agentIdentity.create({
    data: {
      id: "trusted-care-agent",
      displayName: "TrustedCareAgent",
      kind: "trusted",
      publicKeyPem: trustedKeys.publicKeyPem,
      privateKeyPem: trustedKeys.privateKeyPem,
      valironAgentId: "demo-trusted-001",
      walletAddress: "DemoTrustedWallet111111111111111111111111111",
      defaultTier: "AAA",
      defaultRoute: "prod",
      onChainScore: 94,
      behaviorScore: 97,
      identityScore: 100,
      complianceScore: 96
    }
  });

  await prisma.agentIdentity.create({
    data: {
      id: "sketchy-scraper-agent",
      displayName: "SketchyScraperAgent",
      kind: "suspicious",
      publicKeyPem: sketchyKeys.publicKeyPem,
      privateKeyPem: sketchyKeys.privateKeyPem,
      valironAgentId: "demo-sketchy-999",
      walletAddress: "DemoSketchyWallet99999999999999999999999999",
      defaultTier: "C",
      defaultRoute: "sandbox_only",
      onChainScore: 12,
      behaviorScore: 18,
      identityScore: 50,
      complianceScore: 10
    }
  });

  const delegationPayload = {
    version: "healthagent-passport/v1",
    patientId: demoPatient.id,
    agentId: "trusted-care-agent",
    scopes: trustedScopes,
    purpose: "care-admin-prior-auth-demo",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString()
  };

  const canonicalPayload = canonicalJson(delegationPayload);
  const delegationHash = sha256Hex(canonicalPayload);

  await prisma.delegation.create({
    data: {
      id: randomUUID(),
      patientId: demoPatient.id,
      agentId: "trusted-care-agent",
      scopesJson: JSON.stringify(trustedScopes),
      purpose: delegationPayload.purpose,
      expiresAt: new Date(delegationPayload.expiresAt),
      status: "active",
      canonicalPayload,
      delegationHash,
      patientSignature: signText(trustedKeys.privateKeyPem, delegationHash),
      solanaSignature: `mock-solana-anchor-${delegationHash.slice(0, 16)}`,
      solanaExplorerUrl: ""
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seeded HealthAgent Passport demo data.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

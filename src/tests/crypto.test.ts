import { describe, expect, it } from "vitest";
import { canonicalJson } from "@/lib/canonical";
import {
  makeEd25519KeyPair,
  signText,
  signingBaseString,
  verifyText
} from "@/lib/crypto";

describe("crypto", () => {
  it("verifies valid Ed25519 signatures and rejects tampering", () => {
    const keys = makeEd25519KeyPair();
    const message = "hello-health-agent";
    const sig = signText(keys.privateKeyPem, message);

    expect(verifyText(keys.publicKeyPem, message, sig)).toBe(true);
    expect(verifyText(keys.publicKeyPem, `${message}-tampered`, sig)).toBe(
      false
    );
  });

  it("canonicalizes JSON independent of key order", () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe(canonicalJson({ a: 1, b: 2 }));
  });

  it("includes request-critical fields in the signing base string", () => {
    const base = signingBaseString({
      method: "get",
      path: "/fhir/patient/maya-001",
      body: {},
      timestamp: "2026-06-01T12:00:00.000Z",
      nonce: "nonce-1"
    });

    expect(base).toContain("GET");
    expect(base).toContain("/fhir/patient/maya-001");
    expect(base).toContain("nonce-1");
  });
});

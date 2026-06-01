import { describe, expect, it } from "vitest";
import { findEndpointPolicy, routeFromScore } from "@/lib/policy";

describe("policy", () => {
  it("finds patient FHIR policy", () => {
    const policy = findEndpointPolicy("GET", "/fhir/patient/maya-001");
    expect(policy?.requiredScopes).toContain("patient/Patient.read");
  });

  it("rejects bulk dump path", () => {
    const policy = findEndpointPolicy("GET", "/fhir/all?dump=true");
    expect(policy).toBeNull();
  });

  it("routes trust scores", () => {
    expect(routeFromScore(95)).toBe("prod");
    expect(routeFromScore(75)).toBe("prod_throttled");
    expect(routeFromScore(55)).toBe("sandbox");
    expect(routeFromScore(10)).toBe("sandbox_only");
  });
});

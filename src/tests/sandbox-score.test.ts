import { describe, expect, it } from "vitest";
import { mockEvents } from "@/lib/sandbox/mock-sandbox";
import {
  routeImpactFromVerdict,
  scoreSandboxEvents,
  verdictFromRiskScore
} from "@/lib/sandbox/score";

describe("sandbox scoring", () => {
  it("scores trusted events as low risk", () => {
    expect(scoreSandboxEvents(mockEvents["trusted-care-agent"])).toBeLessThan(
      20
    );
  });

  it("scores sketchy events as high risk", () => {
    expect(scoreSandboxEvents(mockEvents["sketchy-scraper-agent"])).toBe(100);
  });

  it("turns high risk into a block verdict", () => {
    expect(verdictFromRiskScore(100)).toBe("block");
  });

  it("downgrades block verdicts to sandbox_only", () => {
    expect(routeImpactFromVerdict("block")).toBe("downgrade_to_sandbox_only");
  });

  it("keeps clean verdicts unchanged", () => {
    expect(routeImpactFromVerdict("clean")).toBe("no_change");
  });
});

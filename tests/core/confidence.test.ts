import { describe, it, expect } from "vitest";
import { calculateConfidence, mergeConfidence, confidenceLabel } from "../../src/core/confidence.js";
import type { Evidence } from "../../src/types/detection.js";

describe("calculateConfidence", () => {
  it("should return 0 for empty evidence", () => {
    expect(calculateConfidence([])).toBe(0);
  });

  it("should return higher confidence for multiple evidence sources", () => {
    const singleEvidence: Evidence[] = [
      { source: "test", type: "dependency", detail: "found dep" },
    ];
    const multiEvidence: Evidence[] = [
      { source: "test", type: "dependency", detail: "found dep" },
      { source: "test", type: "config", detail: "found config" },
      { source: "test", type: "lockfile", detail: "found lockfile" },
    ];

    const single = calculateConfidence(singleEvidence);
    const multi = calculateConfidence(multiEvidence);

    expect(multi).toBeGreaterThan(single);
  });

  it("should weight lockfile evidence higher than env evidence", () => {
    const lockfileEvidence: Evidence[] = [
      { source: "test", type: "lockfile", detail: "found lockfile" },
    ];
    const envEvidence: Evidence[] = [
      { source: "test", type: "env", detail: "found env" },
    ];

    const lockfile = calculateConfidence(lockfileEvidence);
    const env = calculateConfidence(envEvidence);

    expect(lockfile).toBeGreaterThan(env);
  });

  it("should cap at 100", () => {
    const manyEvidence: Evidence[] = Array.from({ length: 20 }, (_, i) => ({
      source: `test${i}`,
      type: "lockfile" as const,
      detail: `evidence ${i}`,
    }));

    expect(calculateConfidence(manyEvidence)).toBeLessThanOrEqual(100);
  });
});

describe("mergeConfidence", () => {
  it("should return 0 for empty scores", () => {
    expect(mergeConfidence([])).toBe(0);
  });

  it("should return the single score", () => {
    expect(mergeConfidence([75])).toBe(75);
  });

  it("should return high score when all scores agree", () => {
    expect(mergeConfidence([80, 85, 90])).toBeGreaterThanOrEqual(75);
  });

  it("should return lower score when scores disagree", () => {
    const agreed = mergeConfidence([80, 85, 90]);
    const disagreed = mergeConfidence([20, 80, 90]);

    expect(agreed).toBeGreaterThanOrEqual(disagreed);
  });
});

describe("confidenceLabel", () => {
  it("should return very-high for >= 90", () => {
    expect(confidenceLabel(95)).toBe("very-high");
    expect(confidenceLabel(90)).toBe("very-high");
  });

  it("should return high for >= 70", () => {
    expect(confidenceLabel(80)).toBe("high");
    expect(confidenceLabel(70)).toBe("high");
  });

  it("should return medium for >= 50", () => {
    expect(confidenceLabel(60)).toBe("medium");
    expect(confidenceLabel(50)).toBe("medium");
  });

  it("should return low for >= 30", () => {
    expect(confidenceLabel(40)).toBe("low");
    expect(confidenceLabel(30)).toBe("low");
  });

  it("should return very-low for < 30", () => {
    expect(confidenceLabel(20)).toBe("very-low");
    expect(confidenceLabel(0)).toBe("very-low");
  });
});

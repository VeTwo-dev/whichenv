import { describe, it, expect } from "vitest";
import { runDiagnostics } from "../../src/analysis/diagnostics.js";
import type { DetectionResult } from "../../src/types/detection.js";

function mockResult(name: string, detected: boolean, error?: string): DetectionResult {
  return {
    detected,
    name,
    value: detected ? { name } : null,
    version: detected ? "1.0.0" : null,
    confidence: detected ? 80 : 0,
    evidence: [],
    reasoning: detected ? `Detected ${name}` : `Not detected`,
    duration: 10,
    error,
  };
}

describe("runDiagnostics", () => {
  it("should pass when all tools are present", () => {
    const results = new Map<string, DetectionResult>();
    results.set("language", mockResult("language", true));
    results.set("testing", mockResult("testing", true));
    results.set("linting", mockResult("linting", true));
    results.set("formatting", mockResult("formatting", true));

    const diagnostics = runDiagnostics(results);
    expect(diagnostics.errors).toHaveLength(0);
    expect(diagnostics.warnings).toHaveLength(0);
  });

  it("should warn when testing is missing", () => {
    const results = new Map<string, DetectionResult>();
    results.set("language", mockResult("language", true));

    const diagnostics = runDiagnostics(results);
    const testingWarning = diagnostics.warnings.find(w => w.code === "NO_TESTING");
    expect(testingWarning).toBeDefined();
  });

  it("should suggest when linting is missing", () => {
    const results = new Map<string, DetectionResult>();
    const diagnostics = runDiagnostics(results);
    const lintingSuggestion = diagnostics.suggestions.find(s => s.code === "NO_LINTING");
    expect(lintingSuggestion).toBeDefined();
  });

  it("should error on failed detectors", () => {
    const results = new Map<string, DetectionResult>();
    results.set("runtime", mockResult("runtime", false, "ENOENT"));

    const diagnostics = runDiagnostics(results);
    const error = diagnostics.errors.find(e => e.code === "DETECT_RUNTIME_ERROR");
    expect(error).toBeDefined();
  });
});

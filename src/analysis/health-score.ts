import type { DetectionResult, MetricsResult, DiagnosticsResult } from "../types/index.js";

/**
 * Analyze health score from detection results.
 * Returns a comprehensive metrics object with scores from 0-100.
 */
export function analyzeHealthScore(
  results: Map<string, DetectionResult>,
  diagnostics: DiagnosticsResult,
): MetricsResult {
  const has = (name: string): boolean => results.get(name)?.detected === true;

  // Architecture score: based on project structure quality
  const architectureScore = calculateArchitectureScore(results);

  // Dependency health: based on having proper dependency management
  const dependencyHealth = calculateDependencyHealth(results);

  // Testing coverage: based on test framework presence
  const testingCoverage = calculateTestingScore(results);

  // Security score: based on security-related configs
  const securityScore = calculateSecurityScore(results, diagnostics);

  // Performance score: based on build tool and optimization configs
  const performanceScore = calculatePerformanceScore(results);

  // Maintainability score: based on linting, formatting, TypeScript
  const maintainabilityScore = calculateMaintainabilityScore(results);

  // Maturity score: based on how "established" the stack is
  const maturityScore = calculateMaturityScore(results);

  // Documentation score
  const documentationScore = calculateDocumentationScore(results);

  // Complexity score (inverted: lower is better)
  const complexityScore = calculateComplexityScore(results);

  // Production readiness
  const productionReadiness = calculateProductionReadiness(results, diagnostics);

  // Overall health score (weighted average)
  const healthScore = Math.round(
    architectureScore * 0.15 +
    dependencyHealth * 0.12 +
    testingCoverage * 0.15 +
    securityScore * 0.12 +
    performanceScore * 0.12 +
    maintainabilityScore * 0.14 +
    maturityScore * 0.1 +
    documentationScore * 0.05 +
    productionReadiness * 0.05
  );

  return {
    healthScore: clamp(healthScore),
    complexityScore: clamp(complexityScore),
    maintainabilityScore: clamp(maintainabilityScore),
    maturityScore: clamp(maturityScore),
    productionReadiness: clamp(productionReadiness),
    architectureScore: clamp(architectureScore),
    dependencyHealth: clamp(dependencyHealth),
    testingCoverage: clamp(testingCoverage),
    documentationScore: clamp(documentationScore),
    securityScore: clamp(securityScore),
    performanceScore: clamp(performanceScore),
  };
}

function calculateArchitectureScore(results: Map<string, DetectionResult>): number {
  let score = 50; // baseline

  const has = (name: string) => results.get(name)?.detected === true;

  if (has("language")) score += 10; // TypeScript is better
  if (has("linting")) score += 8;
  if (has("formatting")) score += 7;
  if (has("workspace")) score += 10;
  if (has("testing")) score += 10;
  if (has("build-tool")) score += 5;

  return Math.min(score, 100);
}

function calculateDependencyHealth(results: Map<string, DetectionResult>): number {
  let score = 40;

  const has = (name: string) => results.get(name)?.detected === true;

  if (has("dependency")) {
    const depResult = results.get("dependency");
    if (depResult?.value) {
      const deps = depResult.value as { total: number; outdated: string[] };
      if (deps.total > 0) score += 30;
      if (deps.outdated.length === 0) score += 20;
      else if (deps.outdated.length < 5) score += 10;
    }
  }

  if (has("package-manager")) score += 10;

  return Math.min(score, 100);
}

function calculateTestingScore(results: Map<string, DetectionResult>): number {
  const testing = results.get("testing");
  if (!testing?.detected) return 20;

  let score = 50;
  const value = testing.value as { frameworks: string[]; config: unknown } | null;
  if (value?.frameworks && value.frameworks.length > 0) score += 30;
  if (value?.config) score += 10;
  if (value?.frameworks?.includes("vitest") || value?.frameworks?.includes("jest")) score += 10;

  return Math.min(score, 100);
}

function calculateSecurityScore(results: Map<string, DetectionResult>, diagnostics: DiagnosticsResult): number {
  let score = 50;

  const has = (name: string) => results.get(name)?.detected === true;

  if (has("git")) score += 5;
  if (has("linting")) score += 10;
  if (has("deployment")) score += 5;

  const errorCount = diagnostics.errors.length;
  const warningCount = diagnostics.warnings.length;

  score -= errorCount * 5;
  score -= warningCount * 2;

  return Math.max(Math.min(score, 100), 0);
}

function calculatePerformanceScore(results: Map<string, DetectionResult>): number {
  let score = 50;

  const has = (name: string) => results.get(name)?.detected === true;

  // Modern build tools = better performance
  if (has("build-tool")) {
    const buildTool = results.get("build-tool");
    const name = (buildTool?.value as { name: string } | null)?.name ?? "";
    if (["vite", "esbuild", "swc", "rspack", "rolldown"].includes(name)) score += 25;
    else score += 10;
  }

  if (has("language")) {
    const lang = results.get("language");
    const value = lang?.value as { primary: string; tsconfig: { target: string } | null } | null;
    if (value?.tsconfig?.target === "ES2022" || value?.tsconfig?.target === "ESNext") score += 10;
  }

  if (has("css")) score += 5;
  if (has("testing")) score += 5;

  return Math.min(score, 100);
}

function calculateMaintainabilityScore(results: Map<string, DetectionResult>): number {
  let score = 30;

  const has = (name: string) => results.get(name)?.detected === true;

  if (has("language")) {
    const lang = results.get("language");
    const value = lang?.value as { tsconfig: { strict: boolean } | null } | null;
    if (value?.tsconfig?.strict) score += 20;
    else score += 5;
  }

  if (has("linting")) score += 15;
  if (has("formatting")) score += 15;
  if (has("testing")) score += 10;
  if (has("documentation")) score += 5;

  return Math.min(score, 100);
}

function calculateMaturityScore(results: Map<string, DetectionResult>): number {
  let score = 40;

  const has = (name: string) => results.get(name)?.detected === true;

  if (has("package-manager")) score += 10;
  if (has("git")) score += 10;
  if (has("deployment")) score += 10;
  if (has("testing")) score += 10;
  if (has("linting")) score += 5;
  if (has("workspace")) score += 5;

  return Math.min(score, 100);
}

function calculateDocumentationScore(results: Map<string, DetectionResult>): number {
  let score = 20;

  const has = (name: string) => results.get(name)?.detected === true;

  if (has("config-file")) score += 20;
  if (has("language")) score += 10;

  // Check if package.json has description
  const project = results.get("runtime");
  if (project?.evidence.some(e => e.detail.includes("description"))) score += 10;

  return Math.min(score, 100);
}

function calculateComplexityScore(results: Map<string, DetectionResult>): number {
  let score = 30; // Lower is better (more complex)

  let techCount = 0;
  for (const r of results.values()) {
    if (r.detected) techCount++;
  }

  score += Math.min(techCount * 5, 40);

  const has = (name: string) => results.get(name)?.detected === true;
  if (has("workspace")) score += 15;
  if (has("database")) score += 10;

  return Math.min(score, 100);
}

function calculateProductionReadiness(results: Map<string, DetectionResult>, diagnostics: DiagnosticsResult): number {
  let score = 30;

  const has = (name: string) => results.get(name)?.detected === true;

  if (has("deployment")) score += 20;
  if (has("testing")) score += 15;
  if (has("git")) score += 10;
  if (has("linting")) score += 10;

  const criticalErrors = diagnostics.errors.filter(d => d.severity === "error").length;
  score -= criticalErrors * 10;

  return Math.max(Math.min(score, 100), 0);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

import type { DetectionResult, DiagnosticsResult, DiagnosticItem } from "../types/index.js";

/**
 * Run diagnostics on the detection results.
 */
export function runDiagnostics(results: Map<string, DetectionResult>): DiagnosticsResult {
  const errors: DiagnosticItem[] = [];
  const warnings: DiagnosticItem[] = [];
  const suggestions: DiagnosticItem[] = [];
  const info: DiagnosticItem[] = [];

  // Check for failed detectors
  for (const [name, result] of results) {
    if (result.error) {
      errors.push({
        code: `DETECT_${name.toUpperCase()}_ERROR`,
        message: `Detection failed for ${name}: ${result.error}`,
        severity: "error",
        category: "detection",
      });
    }
  }

  // Check TypeScript config
  const lang = results.get("language");
  if (lang?.detected) {
    const value = lang.value as { tsconfig: { strict: boolean; target: string; isolatedModules: boolean } | null } | null;
    if (value?.tsconfig) {
      if (!value.tsconfig.strict) {
        warnings.push({
          code: "TS_STRICT_MODE",
          message: "TypeScript strict mode is not enabled",
          severity: "warning",
          category: "typescript",
          fix: "Set \"strict\": true in tsconfig.json",
          impact: "May miss type errors",
        });
      }
      if (!value.tsconfig.isolatedModules) {
        suggestions.push({
          code: "TS_ISOLATED_MODULES",
          message: "TypeScript isolatedModules is not enabled",
          severity: "suggestion",
          category: "typescript",
          fix: "Set \"isolatedModules\": true in tsconfig.json",
          impact: "Better compatibility with modern build tools",
        });
      }
    }
  }

  // Check for missing essential tools
  const testing = results.get("testing");
  if (!testing?.detected) {
    warnings.push({
      code: "NO_TESTING",
      message: "No testing framework detected",
      severity: "warning",
      category: "testing",
      fix: "Add vitest or jest",
      impact: "No automated testing",
    });
  }

  const linting = results.get("linting");
  if (!linting?.detected) {
    suggestions.push({
      code: "NO_LINTING",
      message: "No linter detected",
      severity: "suggestion",
      category: "code-quality",
      fix: "Add ESLint or Biome",
      impact: "No static analysis",
    });
  }

  const formatting = results.get("formatting");
  if (!formatting?.detected) {
    info.push({
      code: "NO_FORMATTING",
      message: "No formatter detected",
      severity: "info",
      category: "code-quality",
      fix: "Add Prettier or Biome",
      impact: "Inconsistent code style",
    });
  }

  // Check workspace health
  const workspace = results.get("workspace");
  if (workspace?.detected) {
    const value = workspace.value as { packages: unknown[] } | null;
    if (value?.packages && Array.isArray(value.packages) && value.packages.length === 0) {
      warnings.push({
        code: "EMPTY_WORKSPACE",
        message: "Workspace detected but no packages found",
        severity: "warning",
        category: "workspace",
        fix: "Configure workspace packages",
        impact: "Workspace may not function correctly",
      });
    }
  }

  // Check dependency issues
  const deps = results.get("dependency");
  if (deps?.detected) {
    const value = deps.value as { outdated: string[]; duplicates: string[] } | null;
    if (value?.outdated && value.outdated.length > 5) {
      warnings.push({
        code: "MANY_OUTDATED",
        message: `${value.outdated.length} outdated dependencies detected`,
        severity: "warning",
        category: "dependencies",
        fix: "Run npm outdated and update packages",
        impact: "May miss security patches and features",
      });
    }
    if (value?.duplicates && value.duplicates.length > 0) {
      info.push({
        code: "DUPLICATE_DEPS",
        message: `${value.duplicates.length} duplicate dependencies found`,
        severity: "info",
        category: "dependencies",
        fix: "Remove duplicate dependencies",
        impact: "Increased bundle size",
      });
    }
  }

  // Check for security
  const deployment = results.get("deployment");
  if (!deployment?.detected) {
    suggestions.push({
      code: "NO_DEPLOYMENT",
      message: "No deployment configuration found",
      severity: "suggestion",
      category: "devops",
      fix: "Add Docker or CI/CD configuration",
      impact: "Manual deployment required",
    });
  }

  const total = errors.length + warnings.length + suggestions.length + info.length;

  return {
    errors,
    warnings,
    suggestions,
    info,
    passed: Math.max(0, 10 - total),
    total: Math.max(total, 10),
  };
}

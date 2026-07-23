import type { DetectionResult, Recommendation, DiagnosticsResult, MetricsResult } from "../types/index.js";

/**
 * Generate intelligent recommendations based on detection results.
 */
export function generateRecommendations(
  results: Map<string, DetectionResult>,
  diagnostics: DiagnosticsResult,
  metrics: MetricsResult,
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // TypeScript strict mode
  const lang = results.get("language");
  if (lang?.detected) {
    const value = lang.value as { tsconfig: { strict: boolean } | null } | null;
    if (value?.tsconfig && !value.tsconfig.strict) {
      recommendations.push({
        severity: "medium",
        category: "configuration",
        title: "Enable TypeScript Strict Mode",
        description: "Your tsconfig.json does not have strict mode enabled. Strict mode catches more errors at compile time.",
        impact: "Improved type safety and fewer runtime errors",
        fix: "Set \"strict\": true in tsconfig.json compilerOptions",
        evidence: lang.evidence,
      });
    }
  }

  // Add testing if missing
  const testing = results.get("testing");
  if (!testing?.detected) {
    recommendations.push({
      severity: "high",
      category: "testing",
      title: "Add a Testing Framework",
      description: "No testing framework was detected. Tests improve code quality and prevent regressions.",
      impact: "Significantly improved code reliability",
      fix: "Install vitest: npm install -D vitest",
      evidence: [],
    });
  }

  // Add linting if missing
  const linting = results.get("linting");
  if (!linting?.detected) {
    recommendations.push({
      severity: "medium",
      category: "code-quality",
      title: "Add a Linter",
      description: "No linter was detected. Linters catch common mistakes and enforce code style.",
      impact: "Consistent code quality across the team",
      fix: "Install ESLint: npm install -D eslint",
      evidence: [],
    });
  }

  // Add formatting if missing
  const formatting = results.get("formatting");
  if (!formatting?.detected) {
    recommendations.push({
      severity: "low",
      category: "code-quality",
      title: "Add a Formatter",
      description: "No formatter was detected. Formatters ensure consistent code style.",
      impact: "Consistent formatting, reduced code review noise",
      fix: "Install Prettier: npm install -D prettier",
      evidence: [],
    });
  }

  // Docker if no deployment detected
  const deployment = results.get("deployment");
  if (!deployment?.detected) {
    recommendations.push({
      severity: "low",
      category: "deployment",
      title: "Add Deployment Configuration",
      description: "No deployment configuration was detected. Consider adding Docker or CI/CD.",
      impact: "Easier deployment and reproducible builds",
      fix: "Create a Dockerfile or add GitHub Actions workflow",
      evidence: [],
    });
  }

  // Upgrade build tool
  const buildTool = results.get("build-tool");
  if (buildTool?.detected) {
    const name = (buildTool.value as { name: string } | null)?.name;
    if (name === "webpack" || name === "parcel") {
      recommendations.push({
        severity: "low",
        category: "performance",
        title: "Consider Modern Build Tools",
        description: `You're using ${name}. Modern alternatives like Vite or Rspack offer faster builds.`,
        impact: "Faster development builds and HMR",
        fix: "Evaluate migrating to Vite or Rspack",
        evidence: buildTool.evidence,
      });
    }
  }

  // Add CI/CD if no GitHub Actions
  const hasCI = deployment?.detected && (
    (deployment.value as { targets: string[] } | null)?.targets?.some(t =>
      ["github-actions", "gitlab-ci", "circleci", "azure-pipelines"].includes(t)
    )
  );
  if (!hasCI) {
    recommendations.push({
      severity: "medium",
      category: "devops",
      title: "Add CI/CD Pipeline",
      description: "No CI/CD pipeline was detected. Automated testing and deployment improve reliability.",
      impact: "Automated testing, building, and deployment",
      fix: "Add GitHub Actions workflow in .github/workflows/",
      evidence: [],
    });
  }

  // Workspace if many packages detected
  const workspace = results.get("workspace");
  if (!workspace?.detected) {
    const deps = results.get("dependency");
    if (deps?.detected) {
      const value = deps.value as { total: number } | null;
      if (value && value.total > 30) {
        recommendations.push({
          severity: "low",
          category: "architecture",
          title: "Consider Monorepo Setup",
          description: "With many dependencies, a monorepo workspace could improve organization.",
          impact: "Better code organization and shared dependencies",
          fix: "Add pnpm-workspace.yaml or turbo.json",
          evidence: deps.evidence,
        });
      }
    }
  }

  // Add changesets for libraries
  const projectType = results.get("runtime");
  if (lang?.detected) {
    const hasChangesets = results.get("config-file")?.evidence?.some(e =>
      e.detail.includes("changeset") || e.path?.includes(".changeset")
    );
    if (!hasChangesets) {
      recommendations.push({
        severity: "info",
        category: "release",
        title: "Add Changesets for Version Management",
        description: "Consider adding @changesets/cli for structured version management and changelogs.",
        impact: "Automated versioning and changelog generation",
        fix: "Install: npm install -D @changesets/cli && npx changeset init",
        evidence: [],
      });
    }
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  recommendations.sort((a, b) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5));

  return recommendations;
}

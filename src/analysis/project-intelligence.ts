import type { DetectionResult, ProjectInfo, ProjectType } from "../types/index.js";

interface IntelligenceResult {
  projectType: ProjectType;
  architectureStyle: string;
  scalability: string;
  ecosystemMaturity: string;
  possibleImprovements: string[];
  securityConcerns: string[];
  performanceConcerns: string[];
  migrationOpportunities: string[];
}

/**
 * Analyze project intelligence beyond simple detection.
 */
export function analyzeProjectIntelligence(
  results: Map<string, DetectionResult>,
  project: ProjectInfo,
): IntelligenceResult {
  const projectType = inferProjectType(results, project);
  const architectureStyle = inferArchitecture(results);
  const scalability = inferScalability(results);
  const ecosystemMaturity = inferEcosystemMaturity(results);
  const possibleImprovements = findImprovements(results);
  const securityConcerns = findSecurityConcerns(results);
  const performanceConcerns = findPerformanceConcerns(results);
  const migrationOpportunities = findMigrationOpportunities(results);

  return {
    projectType,
    architectureStyle,
    scalability,
    ecosystemMaturity,
    possibleImprovements,
    securityConcerns,
    performanceConcerns,
    migrationOpportunities,
  };
}

function inferProjectType(results: Map<string, DetectionResult>, project: ProjectInfo): ProjectType {
  const has = (name: string) => results.get(name)?.detected === true;

  // Monorepo
  if (has("workspace")) return "monorepo";

  // CLI
  if (project.name?.includes("cli") || project.name?.includes("commander")) return "cli";

  // Library - has "main", "module", "exports" in package.json, no "private"
  const frameworks = [...results.values()].filter(r => r.detected && r.name.includes("framework"));
  const isFrontend = frameworks.some(f => {
    const name = (f.value as { name: string } | null)?.name;
    return ["react", "vue", "angular", "svelte", "solid", "preact"].includes(name ?? "");
  });
  const isMetaFramework = frameworks.some(f => {
    const name = (f.value as { name: string } | null)?.name;
    return ["next", "nuxt", "sveltekit", "astro", "remix", "gatsby"].includes(name ?? "");
  });
  const isBackend = frameworks.some(f => {
    const name = (f.value as { name: string } | null)?.name;
    return ["express", "fastify", "nestjs", "hono", "koa", "adonisjs"].includes(name ?? "");
  });

  if (isMetaFramework) return "application";
  if (isFrontend) return "application";
  if (isBackend) return "api";

  const hasDeployment = has("deployment");
  if (hasDeployment) return "application";

  return "unknown";
}

function inferArchitecture(results: Map<string, DetectionResult>): string {
  const has = (name: string) => results.get(name)?.detected === true;

  if (has("workspace")) return "monorepo";
  if (has("next") || has("nuxt") || has("sveltekit")) return "fullstack";
  if (has("express") || has("fastify") || has("nestjs")) return "server";
  if (has("react") || has("vue") || has("angular") || has("svelte")) return "spa";

  return "unknown";
}

function inferScalability(results: Map<string, DetectionResult>): string {
  const has = (name: string) => results.get(name)?.detected === true;

  let score = 0;
  if (has("workspace")) score += 3;
  if (has("typescript")) score += 2;
  if (has("testing")) score += 2;
  if (has("linting")) score += 1;
  if (has("deployment")) score += 2;

  if (score >= 8) return "high";
  if (score >= 5) return "medium";
  if (score >= 2) return "low";
  return "unknown";
}

function inferEcosystemMaturity(results: Map<string, DetectionResult>): string {
  const has = (name: string) => results.get(name)?.detected === true;

  let score = 0;
  if (has("package-manager")) score += 2;
  if (has("git")) score += 2;
  if (has("linting")) score += 1;
  if (has("formatting")) score += 1;
  if (has("testing")) score += 2;
  if (has("deployment")) score += 2;
  if (has("ci-cd")) score += 2;

  if (score >= 8) return "mature";
  if (score >= 5) return "developing";
  if (score >= 2) return "early";
  return "unknown";
}

function findImprovements(results: Map<string, DetectionResult>): string[] {
  const improvements: string[] = [];
  const has = (name: string) => results.get(name)?.detected === true;

  if (!has("testing")) improvements.push("Add a testing framework");
  if (!has("linting")) improvements.push("Add a linter");
  if (!has("formatting")) improvements.push("Add a formatter");
  if (!has("ci-cd")) improvements.push("Add CI/CD pipeline");

  const lang = results.get("language");
  if (lang?.detected) {
    const value = lang.value as { tsconfig: { strict: boolean } | null } | null;
    if (value?.tsconfig && !value.tsconfig.strict) {
      improvements.push("Enable TypeScript strict mode");
    }
  }

  return improvements;
}

function findSecurityConcerns(results: Map<string, DetectionResult>): string[] {
  const concerns: string[] = [];
  const has = (name: string) => results.get(name)?.detected === true;

  if (!has("linting")) concerns.push("No linting configured - potential code quality issues");
  if (!has("git")) concerns.push("No git repository detected");

  return concerns;
}

function findPerformanceConcerns(results: Map<string, DetectionResult>): string[] {
  const concerns: string[] = [];
  const buildTool = results.get("build-tool");

  if (buildTool?.detected) {
    const name = (buildTool.value as { name: string } | null)?.name;
    if (name === "webpack") concerns.push("Consider Vite or Rspack for faster builds");
    if (name === "parcel") concerns.push("Consider Vite for better performance");
  }

  return concerns;
}

function findMigrationOpportunities(results: Map<string, DetectionResult>): string[] {
  const opportunities: string[] = [];
  const has = (name: string) => results.get(name)?.detected === true;

  if (has("eslint") && !has("biome")) {
    opportunities.push("Biome can replace ESLint + Prettier for faster performance");
  }

  if (has("jest") && !has("vitest")) {
    opportunities.push("Vitest offers native ESM support and faster execution than Jest");
  }

  if (has("webpack") && !has("vite")) {
    opportunities.push("Vite offers faster HMR and build times compared to Webpack");
  }

  return opportunities;
}

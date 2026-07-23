import type { DetectionResult } from "../types/index.js";

/**
 * Detect project capabilities based on detection results.
 */
export function detectCapabilities(results: Map<string, DetectionResult>): string[] {
  const capabilities: string[] = [];
  const has = (name: string) => results.get(name)?.detected === true;

  // Runtime capabilities
  if (has("runtime")) {
    const runtime = results.get("runtime");
    const value = runtime?.value as { name: string; capabilities: string[] } | null;
    if (value?.capabilities) {
      capabilities.push(...value.capabilities.map(c => `runtime:${c}`));
    }
  }

  // Framework capabilities
  if (has("next")) capabilities.push("framework:ssr", "framework:ssr", "framework:routing", "framework:api-routes", "framework:middleware");
  if (has("nuxt")) capabilities.push("framework:ssr", "framework:srr", "framework:routing", "framework:auto-imports");
  if (has("sveltekit")) capabilities.push("framework:ssr", "framework:routing", "framework:server-functions");
  if (has("astro")) capabilities.push("framework:islands", "framework:content-collections");
  if (has("remix")) capabilities.push("framework:ssr", "framework:routing", "framework:forms");
  if (has("react")) capabilities.push("framework:components", "framework:virtual-dom");
  if (has("vue")) capabilities.push("framework:components", "framework:reactivity");
  if (has("angular")) capabilities.push("framework:components", "framework:dependency-injection", "framework:routing");
  if (has("svelte")) capabilities.push("framework:components", "framework:compiler");
  if (has("solid")) capabilities.push("framework:components", "framework:signals");
  if (has("express") || has("fastify") || has("hono")) capabilities.push("framework:http-server");
  if (has("nestjs")) capabilities.push("framework:http-server", "framework:dependency-injection", "framework:modules");

  // Build tool capabilities
  if (has("vite")) capabilities.push("build:hmr", "build:esm", "build:dev-server");
  if (has("webpack")) capabilities.push("build:code-splitting", "build:loaders");
  if (has("esbuild")) capabilities.push("build:fast-bundling");
  if (has("tsup")) capabilities.push("build:library-bundling");

  // Language capabilities
  if (has("language")) {
    const lang = results.get("language");
    const value = lang?.value as { primary: string; moduleSystem: string } | null;
    if (value?.primary === "typescript") capabilities.push("language:types", "language:generics");
    if (value?.moduleSystem === "esm") capabilities.push("language:tree-shaking");
  }

  // Testing capabilities
  if (has("testing")) {
    const testing = results.get("testing");
    const value = testing?.value as { frameworks: string[] } | null;
    if (value?.frameworks) {
      if (value.frameworks.includes("vitest") || value.frameworks.includes("jest")) capabilities.push("testing:unit");
      if (value.frameworks.includes("playwright") || value.frameworks.includes("cypress")) capabilities.push("testing:e2e");
    }
  }

  // CSS capabilities
  if (has("css")) {
    capabilities.push("css:utility-classes");
  }

  // API capabilities
  if (has("api")) {
    const api = results.get("api");
    const value = api?.value as { types: string[] } | null;
    if (value?.types) {
      if (value.types.includes("graphql")) capabilities.push("api:graphql");
      if (value.types.includes("trpc")) capabilities.push("api:trpc");
      if (value.types.includes("rest")) capabilities.push("api:rest");
    }
  }

  // Deployment capabilities
  if (has("deployment")) {
    capabilities.push("deployment:automated");
  }

  // Workspace capabilities
  if (has("workspace")) {
    capabilities.push("workspace:monorepo", "workspace:shared-dependencies");
  }

  // Docker
  if (has("docker")) {
    capabilities.push("containerization", "docker");
  }

  return [...new Set(capabilities)].sort();
}

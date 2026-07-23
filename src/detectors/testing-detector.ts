import type {
  DetectionResult,
  DetectionContext,
  TestingInfo,
  TestFrameworkName,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";
import { calculateConfidence } from "../core/confidence.js";

const TEST_DEPS: Record<string, TestFrameworkName> = {
  vitest: "vitest",
  jest: "jest",
  "@playwright/test": "playwright",
  cypress: "cypress",
  ava: "ava",
  jasmine: "jasmine",
  mocha: "mocha",
  webdriverio: "webdriverio",
};

const CONFIG_GLOBS: Array<[string, TestFrameworkName]> = [
  ["vitest.config.*", "vitest"],
  ["jest.config.*", "jest"],
  ["jest.setup.*", "jest"],
  ["playwright.config.*", "playwright"],
  ["cypress.config.*", "cypress"],
  [".cypress.json", "cypress"],
  ["wdio.conf.*", "webdriverio"],
  [".mocharc.*", "mocha"],
  ["jasmine.json", "jasmine"],
  ["ava.config.*", "ava"],
];

const COVERAGE_TOOLS = [
  "c8",
  "istanbul",
  "nyc",
  "@vitest/coverage-v8",
  "@vitest/coverage-istanbul",
  "@jest/globals",
  "codecov",
];

function detectCoverageTool(allDeps: Map<string, string>): string | null {
  for (const tool of COVERAGE_TOOLS) {
    if (allDeps.has(tool)) return tool;
  }
  return null;
}

function findTestConfigPaths(ctx: DetectionContext, frameworks: TestFrameworkName[]): string[] {
  const paths: string[] = [];
  const frameworkSet = new Set(frameworks);

  for (const [glob, framework] of CONFIG_GLOBS) {
    if (!frameworkSet.has(framework)) continue;
    for (const configPath of ctx.configFiles.keys()) {
      if (matchesGlob(configPath, glob) && !paths.includes(configPath)) {
        paths.push(configPath);
      }
    }
  }

  return paths;
}

function findTestConfig(
  ctx: DetectionContext,
  frameworks: TestFrameworkName[]
): Record<string, unknown> | null {
  const frameworkSet = new Set(frameworks);

  for (const [glob, framework] of CONFIG_GLOBS) {
    if (!frameworkSet.has(framework)) continue;
    for (const [configPath, config] of ctx.configFiles) {
      if (matchesGlob(configPath, glob) && typeof config === "object" && config !== null) {
        return config;
      }
    }
  }

  return null;
}

export const detector = {
  meta: {
    name: "testing",
    version: "1.0.0",
    description: "Detects test frameworks, runners, and coverage tools",
    author: "@vetwo",
    stage: "tooling",
    priority: 70,
    dependencies: [],
    tags: ["testing", "test-runner", "coverage", "e2e", "unit-test"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<TestingInfo>> {
    const start = performance.now();
    const evidence = new EvidenceCollector();

    const allDeps = new Map<string, string>([
      ...ctx.dependencies,
      ...ctx.devDependencies,
    ]);

    const frameworks: TestFrameworkName[] = [];

    for (const [pkg, framework] of Object.entries(TEST_DEPS)) {
      const version = allDeps.get(pkg);
      if (version) {
        evidence.addDependency("package.json", `Found ${pkg} v${version}`, pkg);
        if (!frameworks.includes(framework)) {
          frameworks.push(framework);
        }
      }
    }

    for (const [glob, framework] of CONFIG_GLOBS) {
      for (const configPath of ctx.configFiles.keys()) {
        if (matchesGlob(configPath, glob)) {
          evidence.addConfig("config", `Found test config ${configPath}`, configPath);
          if (!frameworks.includes(framework)) {
            frameworks.push(framework);
          }
        }
      }
    }

    const coverageTool = detectCoverageTool(allDeps);
    if (coverageTool) {
      evidence.addDependency("package.json", `Found coverage tool ${coverageTool}`, coverageTool);
    }

    const configPaths = findTestConfigPaths(ctx, frameworks);
    const config = findTestConfig(ctx, frameworks);

    const detected = frameworks.length > 0;
    const confidence = calculateConfidence(evidence.getAll());
    const duration = performance.now() - start;

    const value: TestingInfo = {
      frameworks,
      config,
      configPaths,
      coverageTool,
    };

    return {
      detected,
      name: "testing",
      value: detected ? value : null,
      version: null,
      confidence,
      evidence: evidence.getAll(),
      reasoning: detected
        ? `Detected ${frameworks.length} test ${frameworks.length === 1 ? "framework" : "frameworks"}: ${frameworks.join(", ")}${coverageTool ? ` with ${coverageTool} for coverage` : ""}`
        : "No test frameworks or configurations detected",
      duration,
    };
  },
};

function matchesGlob(path: string, pattern: string): boolean {
  const basename = path.split("/").pop() ?? path;
  const regex = new RegExp(
    "^" +
      pattern
        .replace(/\./g, "\\.")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".") +
      "$"
  );
  return regex.test(basename);
}

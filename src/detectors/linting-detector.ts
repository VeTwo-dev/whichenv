import type {
  DetectionContext,
  DetectionResult,
  LintingInfo,
  LintingName,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";

interface LintingCandidate {
  name: LintingName;
  depNames: string[];
  configPatterns: string[];
}

const candidates: LintingCandidate[] = [
  {
    name: "eslint",
    depNames: ["eslint"],
    configPatterns: [
      "eslint.config.js",
      "eslint.config.mjs",
      "eslint.config.cjs",
      "eslint.config.ts",
      "eslint.config.mts",
      ".eslintrc.js",
      ".eslintrc.cjs",
      ".eslintrc.mjs",
      ".eslintrc.json",
      ".eslintrc.yml",
      ".eslintrc.yaml",
      ".eslintrc",
    ],
  },
  {
    name: "biome",
    depNames: ["@biomejs/biome", "biome"],
    configPatterns: ["biome.json", "biome.jsonc"],
  },
  {
    name: "oxlint",
    depNames: ["oxlint"],
    configPatterns: [".oxlintrc.json"],
  },
  {
    name: "tslint",
    depNames: ["tslint"],
    configPatterns: ["tslint.json"],
  },
  {
    name: "standardjs",
    depNames: ["standard"],
    configPatterns: [],
  },
];

async function findConfigFile(
  ctx: DetectionContext,
  patterns: string[],
): Promise<{ configPath: string; config: Record<string, unknown> } | null> {
  for (const pattern of patterns) {
    const configPath = `${ctx.root}/${pattern}`;
    if (await ctx.fs.exists(configPath)) {
      const parsed = await ctx.fs.readJSON(configPath);
      return { configPath, config: parsed ?? {} };
    }
  }
  return null;
}

function findDepVersion(ctx: DetectionContext, depNames: string[]): { name: string; version: string } | null {
  for (const dep of depNames) {
    const version = ctx.dependencies.get(dep);
    if (version) return { name: dep, version };
    const devVersion = ctx.devDependencies.get(dep);
    if (devVersion) return { name: dep, version: devVersion };
  }
  return null;
}

function detectPlugins(
  ctx: DetectionContext,
  lintingName: LintingName,
): string[] {
  const plugins: string[] = [];
  const prefixes: Record<LintingName, string[]> = {
    eslint: ["eslint-plugin-", "@eslint/", "eslint-config-", "@typescript-eslint/"],
    biome: [],
    oxlint: [],
    tslint: ["tslint-plugin-"],
    standardjs: [],
    unknown: [],
  };

  for (const dep of ctx.dependencies.keys()) {
    for (const prefix of prefixes[lintingName]) {
      if (dep.startsWith(prefix)) plugins.push(dep);
    }
  }
  for (const dep of ctx.devDependencies.keys()) {
    for (const prefix of prefixes[lintingName]) {
      if (dep.startsWith(prefix) && !plugins.includes(dep)) plugins.push(dep);
    }
  }

  return plugins;
}

export const detector = {
  meta: {
    name: "linting",
    version: "1.0.0",
    description: "Detects linting tools configured in the project",
    author: "@vetwo",
    stage: "tooling",
    priority: 65,
    dependencies: [],
    tags: ["linting", "eslint", "biome", "oxlint", "code-quality"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<LintingInfo>> {
    const start = performance.now();
    const evidence = new EvidenceCollector();

    const detected: LintingInfo[] = [];

    for (const candidate of candidates) {
      const dep = findDepVersion(ctx, candidate.depNames);
      if (!dep) continue;

      evidence.addDependency(
        `linting/${candidate.name}`,
        `Found dependency ${dep.name}@${dep.version}`,
        dep.name,
      );

      const configFile = await findConfigFile(ctx, candidate.configPatterns);
      let config: Record<string, unknown> | null = null;
      let configPath: string | null = null;

      if (configFile) {
        config = configFile.config;
        configPath = configFile.configPath;
        evidence.addConfig(
          `linting/${candidate.name}`,
          `Found config at ${configPath}`,
          configPath,
        );
      }

      const plugins = detectPlugins(ctx, candidate.name);
      if (plugins.length > 0) {
        evidence.addDependency(
          `linting/${candidate.name}`,
          `Detected ${plugins.length} plugin(s): ${plugins.join(", ")}`,
        );
      }

      detected.push({
        name: candidate.name,
        version: dep.version,
        config,
        configPath,
        plugins,
      });
    }

    const duration = performance.now() - start;

    if (detected.length === 0) {
      return {
        detected: false,
        name: "linting",
        value: null,
        version: null,
        confidence: 0,
        evidence: evidence.getAll(),
        reasoning: "No linting tools detected in dependencies or config files",
        duration,
      };
    }

    const primary = detected[0]!;
    const confidence = Math.min(
      100,
      50 +
        (primary.configPath ? 25 : 0) +
        (primary.plugins.length > 0 ? 15 : 0) +
        (detected.length > 1 ? 10 : 0),
    );

    return {
      detected: true,
      name: primary.name,
      value: primary,
      version: primary.version,
      confidence,
      evidence: evidence.getAll(),
      reasoning: `Detected ${detected.length} linting tool(s): ${detected.map((d) => d.name).join(", ")}`,
      duration,
    };
  },
};

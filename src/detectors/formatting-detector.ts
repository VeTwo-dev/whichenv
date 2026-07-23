import type {
  DetectionContext,
  DetectionResult,
  FormattingInfo,
  FormattingName,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";

interface FormattingCandidate {
  name: FormattingName;
  depNames: string[];
  configPatterns: string[];
}

const candidates: FormattingCandidate[] = [
  {
    name: "prettier",
    depNames: ["prettier"],
    configPatterns: [
      ".prettierrc",
      ".prettierrc.json",
      ".prettierrc.yml",
      ".prettierrc.yaml",
      ".prettierrc.json5",
      ".prettierrc.js",
      ".prettierrc.cjs",
      ".prettierrc.mjs",
      ".prettierrc.toml",
      "prettier.config.js",
      "prettier.config.cjs",
      "prettier.config.mjs",
      "prettier.config.ts",
      "prettier.config.mts",
    ],
  },
  {
    name: "biome",
    depNames: ["@biomejs/biome", "biome"],
    configPatterns: ["biome.json", "biome.jsonc"],
  },
  {
    name: "dprint",
    depNames: ["dprint"],
    configPatterns: ["dprint.json", ".dprint.json"],
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

function findDepVersion(
  ctx: DetectionContext,
  depNames: string[],
): { name: string; version: string } | null {
  for (const dep of depNames) {
    const version = ctx.dependencies.get(dep);
    if (version) return { name: dep, version };
    const devVersion = ctx.devDependencies.get(dep);
    if (devVersion) return { name: dep, version: devVersion };
  }
  return null;
}

export const detector = {
  meta: {
    name: "formatting",
    version: "1.0.0",
    description: "Detects code formatting tools configured in the project",
    author: "@vetwo",
    stage: "tooling",
    priority: 60,
    dependencies: [],
    tags: ["formatting", "prettier", "biome", "dprint", "code-style"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<FormattingInfo>> {
    const start = performance.now();
    const evidence = new EvidenceCollector();

    const detected: FormattingInfo[] = [];

    for (const candidate of candidates) {
      const dep = findDepVersion(ctx, candidate.depNames);
      if (!dep) continue;

      evidence.addDependency(
        `formatting/${candidate.name}`,
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
          `formatting/${candidate.name}`,
          `Found config at ${configPath}`,
          configPath,
        );
      }

      detected.push({
        name: candidate.name,
        version: dep.version,
        config,
        configPath,
      });
    }

    const duration = performance.now() - start;

    if (detected.length === 0) {
      return {
        detected: false,
        name: "formatting",
        value: null,
        version: null,
        confidence: 0,
        evidence: evidence.getAll(),
        reasoning: "No formatting tools detected in dependencies or config files",
        duration,
      };
    }

    const primary = detected[0]!;
    const confidence = Math.min(
      100,
      50 +
        (primary.configPath ? 30 : 0) +
        (detected.length > 1 ? 20 : 0),
    );

    return {
      detected: true,
      name: primary.name,
      value: primary,
      version: primary.version,
      confidence,
      evidence: evidence.getAll(),
      reasoning: `Detected ${detected.length} formatting tool(s): ${detected.map((d) => d.name).join(", ")}`,
      duration,
    };
  },
};

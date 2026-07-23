import type {
  DetectionContext,
  DetectionResult,
  ConfigFileInfo,
  DetectorPlugin,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";

const CONFIG_PATTERNS: Array<{ glob: string; name: string }> = [
  { glob: "package.json", name: "package.json" },
  { glob: "tsconfig.json", name: "tsconfig.json" },
  { glob: "tsconfig.*.json", name: "tsconfig.*.json" },
  { glob: "turbo.json", name: "turbo.json" },
  { glob: "nx.json", name: "nx.json" },
  { glob: "lerna.json", name: "lerna.json" },
  { glob: "rush.json", name: "rush.json" },
  { glob: "moon.yml", name: "moon.yml" },
  { glob: "vite.config.*", name: "vite.config.*" },
  { glob: "webpack.config.*", name: "webpack.config.*" },
  { glob: "rollup.config.*", name: "rollup.config.*" },
  { glob: "rspack.config.*", name: "rspack.config.*" },
  { glob: "tsup.config.*", name: "tsup.config.*" },
  { glob: "eslint.config.*", name: "eslint.config.*" },
  { glob: ".eslintrc.*", name: ".eslintrc.*" },
  { glob: "prettier.config.*", name: "prettier.config.*" },
  { glob: ".prettierrc.*", name: ".prettierrc.*" },
  { glob: "biome.json", name: "biome.json" },
  { glob: "tailwind.config.*", name: "tailwind.config.*" },
  { glob: "postcss.config.*", name: "postcss.config.*" },
  { glob: "babel.config.*", name: "babel.config.*" },
  { glob: "jest.config.*", name: "jest.config.*" },
  { glob: "vitest.config.*", name: "vitest.config.*" },
  { glob: "playwright.config.*", name: "playwright.config.*" },
  { glob: "docker-compose.*", name: "docker-compose.*" },
  { glob: "Dockerfile", name: "Dockerfile" },
  { glob: "pnpm-workspace.yaml", name: "pnpm-workspace.yaml" },
  { glob: ".github/workflows/*.yml", name: ".github/workflows/*.yml" },
  { glob: ".github/workflows/*.yaml", name: ".github/workflows/*.yaml" },
  { glob: "renovate.json", name: "renovate.json" },
  { glob: "release-please.config.json", name: "release-please.config.json" },
  { glob: ".changeset/config.json", name: ".changeset/config.json" },
  { glob: "typedoc.json", name: "typedoc.json" },
  { glob: "storybook/main.*", name: "storybook/main.*" },
  { glob: "api-extractor.json", name: "api-extractor.json" },
];

function inferFormat(
  filePath: string,
): "json" | "jsonc" | "yaml" | "yml" | "js" | "ts" | "mjs" | "cjs" | "toml" | "ini" | "unknown" {
  if (filePath.endsWith(".json")) return "json";
  if (filePath.endsWith(".jsonc")) return "jsonc";
  if (filePath.endsWith(".yaml")) return "yaml";
  if (filePath.endsWith(".yml")) return "yml";
  if (filePath.endsWith(".ts")) return "ts";
  if (filePath.endsWith(".mts")) return "ts";
  if (filePath.endsWith(".cts")) return "cjs";
  if (filePath.endsWith(".mjs")) return "mjs";
  if (filePath.endsWith(".js")) return "js";
  if (filePath.endsWith(".cjs")) return "cjs";
  if (filePath.endsWith(".toml")) return "toml";
  if (filePath.endsWith(".ini")) return "ini";
  if (filePath === "Dockerfile") return "unknown";
  return "unknown";
}

function extractName(filePath: string): string {
  const parts = filePath.split("/");
  return parts[parts.length - 1] ?? filePath;
}

export const detector: DetectorPlugin = {
  meta: {
    name: "config-file",
    version: "1.0.0",
    description: "Detects and catalogs project configuration files",
    author: "whichenv",
    stage: "config",
    priority: 35,
    dependencies: [],
    tags: ["config", "files", "package.json", "tsconfig"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<ConfigFileInfo[]>> {
    const start = performance.now();
    const evidence = new EvidenceCollector();
    const configFiles: ConfigFileInfo[] = [];
    const seen = new Set<string>();

    for (const pattern of CONFIG_PATTERNS) {
      if (ctx.signal.aborted) break;

      const matches = await ctx.fs.glob(pattern.glob, ctx.root);
      for (const match of matches) {
        if (seen.has(match)) continue;
        seen.add(match);

        let parsed: Record<string, unknown> | null = null;
        const format = inferFormat(match);

        if (format === "json" || format === "jsonc") {
          try {
            parsed = await ctx.fs.readJSON(match);
          } catch {
            // JSON parse failure — leave parsed as null
          }
        }

        let size = 0;
        const content = await ctx.fs.readFile(match);
        if (content !== null) {
          size = content.length;
        }

        const info: ConfigFileInfo = {
          path: match,
          name: extractName(match),
          format,
          parsed,
          size,
        };

        configFiles.push(info);
        evidence.addConfig(
          "config-file-detector",
          `Found config: ${match} (${format}${parsed ? ", parsed" : ", unparsed"})`,
          match,
        );
      }
    }

    const duration = performance.now() - start;

    if (configFiles.length === 0) {
      return {
        detected: false,
        name: "config-file",
        value: null,
        version: null,
        confidence: 0,
        evidence: evidence.getAll(),
        reasoning: "No configuration files detected",
        duration,
      };
    }

    const confidence = Math.min(100, 30 + configFiles.length * 5);

    return {
      detected: true,
      name: "config-file",
      value: configFiles,
      version: null,
      confidence,
      evidence: evidence.getAll(),
      reasoning: `Found ${configFiles.length} configuration file(s) in the project`,
      duration,
    };
  },
};

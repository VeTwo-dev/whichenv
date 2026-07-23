import type {
  DetectionResult,
  DetectionContext,
  CSSFrameworkInfo,
  CSSFrameworkName,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";
import { calculateConfidence } from "../core/confidence.js";

const CSS_DEPS: Record<string, CSSFrameworkName> = {
  tailwindcss: "tailwindcss",
  "@unocss/cli": "unocss",
  unocss: "unocss",
  windicss: "windicss",
  "@pandacss/dev": "pandacss",
  postcss: "postcss",
  sass: "sass",
  less: "less",
  stylus: "stylus",
  "@emotion/react": "emotion",
  "@emotion/styled": "emotion",
  "styled-components": "styled-components",
  "vanilla-extract": "vanilla-extract",
};

const CONFIG_GLOBS: Array<[string, CSSFrameworkName]> = [
  ["tailwind.config.*", "tailwindcss"],
  ["uno.config.*", "unocss"],
  ["windi.config.*", "windicss"],
  ["postcss.config.*", "postcss"],
  ["panda.config.*", "pandacss"],
  [".stylelintrc*", "postcss"],
];

function detectCssModules(sourceFiles: string[]): boolean {
  return sourceFiles.some((f) => /\.module\.(css|scss|less|styl)$/.test(f));
}

export const detector = {
  meta: {
    name: "css",
    version: "1.0.0",
    description: "Detects CSS frameworks, preprocessors, and styling solutions",
    author: "@vetwo",
    stage: "tooling",
    priority: 65,
    dependencies: [],
    tags: ["css", "styling", "preprocessor", "tailwind", "postcss"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<CSSFrameworkInfo[]>> {
    const start = performance.now();
    const evidence = new EvidenceCollector();
    const frameworks: CSSFrameworkInfo[] = [];

    const allDeps = new Map<string, string>([
      ...ctx.dependencies,
      ...ctx.devDependencies,
    ]);

    for (const [pkg, frameworkName] of Object.entries(CSS_DEPS)) {
      const version = allDeps.get(pkg);
      if (version) {
        evidence.addDependency("package.json", `Found ${pkg} v${version}`, pkg);
        const configPath = findConfigPath(ctx, frameworkName);
        let config: Record<string, unknown> | null = null;
        if (configPath) {
          config = ctx.configFiles.get(configPath) ?? null;
          if (config) {
            evidence.addConfig("config", `Loaded ${configPath}`, configPath);
          }
        }
        frameworks.push({
          name: frameworkName,
          version,
          config,
          configPath,
        });
      }
    }

    for (const [glob, frameworkName] of CONFIG_GLOBS) {
      const matched = ctx.configFiles.size > 0;
      if (matched) {
        for (const [configPath] of ctx.configFiles) {
          if (matchesGlob(configPath, glob)) {
            evidence.addConfig("config", `Detected config file ${configPath}`, configPath);
            if (!frameworks.some((f) => f.name === frameworkName)) {
              frameworks.push({
                name: frameworkName,
                version: allDeps.get(depForFramework(frameworkName)) ?? null,
                config: ctx.configFiles.get(configPath) ?? null,
                configPath,
              });
            }
          }
        }
      }
    }

    if (detectCssModules(ctx.sourceFiles)) {
      evidence.addStructure("source-files", "Found .module.css files in source");
      if (!frameworks.some((f) => f.name === "css-modules")) {
        frameworks.push({
          name: "css-modules",
          version: null,
          config: null,
          configPath: null,
        });
      }
    }

    const detected = frameworks.length > 0;
    const confidence = calculateConfidence(evidence.getAll());
    const duration = performance.now() - start;

    return {
      detected,
      name: "css",
      value: detected ? frameworks : null,
      version: null,
      confidence,
      evidence: evidence.getAll(),
      reasoning: detected
        ? `Detected ${frameworks.length} CSS ${frameworks.length === 1 ? "tool" : "tools"}: ${frameworks.map((f) => f.name).join(", ")}`
        : "No CSS frameworks or preprocessors detected",
      duration,
    };
  },
};

function findConfigPath(ctx: DetectionContext, framework: CSSFrameworkName): string | null {
  const patterns: Record<CSSFrameworkName, string[]> = {
    tailwindcss: ["tailwind.config.js", "tailwind.config.ts", "tailwind.config.cjs", "tailwind.config.mjs"],
    unocss: ["uno.config.ts", "uno.config.js", "uno.config.mts"],
    windicss: ["windi.config.ts", "windi.config.js"],
    pandacss: ["panda.config.ts", "panda.config.js"],
    postcss: ["postcss.config.js", "postcss.config.ts", "postcss.config.cjs", "postcss.config.mjs", ".postcssrc"],
    sass: [],
    less: [],
    stylus: [],
    emotion: [],
    "styled-components": [],
    "vanilla-extract": ["vanilla.config.ts"],
    "css-modules": [],
    unknown: [],
  };
  const candidates = patterns[framework] ?? [];
  for (const candidate of candidates) {
    if (ctx.configFiles.has(candidate)) return candidate;
  }
  return null;
}

function matchesGlob(path: string, pattern: string): boolean {
  const regex = new RegExp(
    "^" +
      pattern
        .replace(/\./g, "\\.")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".") +
      "$"
  );
  return regex.test(path.split("/").pop() ?? "");
}

function depForFramework(framework: CSSFrameworkName): string {
  const map: Record<CSSFrameworkName, string> = {
    tailwindcss: "tailwindcss",
    unocss: "unocss",
    windicss: "windicss",
    pandacss: "@pandacss/dev",
    postcss: "postcss",
    sass: "sass",
    less: "less",
    stylus: "stylus",
    emotion: "@emotion/react",
    "styled-components": "styled-components",
    "vanilla-extract": "vanilla-extract",
    "css-modules": "",
    unknown: "",
  };
  return map[framework] ?? "";
}

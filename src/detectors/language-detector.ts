import type {
  LanguageInfo,
  LanguageName,
  ModuleSystem,
  TypeScriptConfig,
  LanguageResult,
  DetectionResult,
  DetectionContext,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";

const JS_EXTENSIONS = [".js", ".mjs", ".cjs"];
const TS_EXTENSIONS = [".ts", ".mts", ".cts"];
const JSX_EXTENSIONS = [".jsx", ".mjsx", ".cjsx"];
const TSX_EXTENSIONS = [".tsx", ".mtsx", ".ctsx"];
const ALL_SOURCE_EXTENSIONS = [...JS_EXTENSIONS, ...TS_EXTENSIONS, ...JSX_EXTENSIONS, ...TSX_EXTENSIONS];

const TSCONFIG_CANDIDATES = [
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
];

function countExtensions(sourceFiles: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const file of sourceFiles) {
    for (const ext of ALL_SOURCE_EXTENSIONS) {
      if (file.endsWith(ext)) {
        counts[ext] = (counts[ext] || 0) + 1;
        break;
      }
    }
  }
  return counts;
}

function determinePrimary(counts: Record<string, number>): LanguageName {
  const jsCount = JS_EXTENSIONS.reduce((sum, ext) => sum + (counts[ext] || 0), 0);
  const tsCount = TS_EXTENSIONS.reduce((sum, ext) => sum + (counts[ext] || 0), 0);
  const jsxCount = JSX_EXTENSIONS.reduce((sum, ext) => sum + (counts[ext] || 0), 0);
  const tsxCount = TSX_EXTENSIONS.reduce((sum, ext) => sum + (counts[ext] || 0), 0);

  const total = jsCount + tsCount + jsxCount + tsxCount;
  if (total === 0) return "unknown";

  const hasJsx = jsxCount > 0 || tsxCount > 0;
  const isTypescript = tsCount > tsxCount || tsxCount > 0;

  if (isTypescript && hasJsx) return "tsx";
  if (!isTypescript && hasJsx) return "jsx";
  if (isTypescript) return "typescript";
  if (jsCount > 0) return "javascript";

  return "unknown";
}

function determineModuleSystem(
  packageJson: Record<string, unknown> | null,
  counts: Record<string, number>,
): ModuleSystem {
  if (packageJson && typeof packageJson.type === "string") {
    if (packageJson.type === "module") return "esm";
    if (packageJson.type === "commonjs") return "commonjs";
  }

  const esmCount = (counts[".mjs"] || 0) + (counts[".mts"] || 0);
  const cjsCount = (counts[".cjs"] || 0) + (counts[".cts"] || 0);

  if (esmCount > 0 && cjsCount > 0) return "mixed";
  if (esmCount > 0) return "esm";
  if (cjsCount > 0) return "commonjs";

  const jsCount = counts[".js"] || 0;
  const tsCount = counts[".ts"] || 0;
  const jsxCount = counts[".jsx"] || 0;
  const tsxCount = counts[".tsx"] || 0;
  const standardCount = jsCount + tsCount + jsxCount + tsxCount;

  if (standardCount === 0 && esmCount + cjsCount === 0) return "unknown";

  return "esm";
}

function parseTypeScriptConfig(config: Record<string, unknown>): TypeScriptConfig {
  const compilerOptions = config.compilerOptions as Record<string, unknown> | undefined;

  const getPathMapping = (
    raw: unknown,
  ): Record<string, string[]> | null => {
    if (!raw || typeof raw !== "object") return null;
    const result: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        result[key] = value.map(String);
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  };

  return {
    target: compilerOptions?.target != null ? String(compilerOptions.target) : null,
    module: compilerOptions?.module != null ? String(compilerOptions.module) : null,
    moduleResolution: compilerOptions?.moduleResolution != null
      ? String(compilerOptions.moduleResolution)
      : null,
    strict: compilerOptions?.strict === true,
    jsx: compilerOptions?.jsx != null ? String(compilerOptions.jsx) : null,
    decorators:
      compilerOptions?.experimentalDecorators === true ||
      compilerOptions?.emitDecoratorMetadata === true,
    paths: getPathMapping(compilerOptions?.paths),
    aliases: null,
    esModuleInterop: compilerOptions?.esModuleInterop === true,
    verbatimModuleSyntax: compilerOptions?.verbatimModuleSyntax === true,
    isolatedModules: compilerOptions?.isolatedModules === true,
  };
}

async function findTsConfig(ctx: DetectionContext): Promise<{
  config: TypeScriptConfig | null;
  path: string | null;
  raw: Record<string, unknown> | null;
}> {
  for (const candidate of TSCONFIG_CANDIDATES) {
    const fullPath = `${ctx.root}/${candidate}`;
    const exists = await ctx.fs.exists(fullPath);
    if (exists) {
      const raw = await ctx.fs.readJSON(fullPath);
      if (raw) {
        return {
          config: parseTypeScriptConfig(raw),
          path: candidate,
          raw,
        };
      }
    }
  }
  return { config: null, path: null, raw: null };
}

export const detector = {
  meta: {
    name: "language",
    version: "1.0.0",
    description: "Detects primary language, module system, and TypeScript configuration",
    author: "@vetwo",
    stage: "language",
    priority: 70,
    dependencies: [] as string[],
    tags: ["language", "typescript", "javascript", "module-system"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<LanguageInfo>> {
    const start = Date.now();
    const evidence = new EvidenceCollector();

    const counts = countExtensions(ctx.sourceFiles);
    const totalFiles = Object.values(counts).reduce((sum, c) => sum + c, 0);

    if (totalFiles > 0) {
      evidence.addStructure(
        "language-detector",
        `Found ${totalFiles} source file(s) with extensions: ${Object.entries(counts)
          .map(([ext, count]) => `${ext}(${count})`)
          .join(", ")}`,
      );
    }

    const primary = determinePrimary(counts);
    const moduleSystem = determineModuleSystem(ctx.packageJson, counts);

    evidence.addStructure(
      "language-detector",
      `Primary language: ${primary}, module system: ${moduleSystem}`,
    );

    if (ctx.packageJson && typeof ctx.packageJson.type === "string") {
      evidence.addConfig(
        "language-detector",
        `package.json type field: "${ctx.packageJson.type}"`,
        "package.json",
      );
    }

    const tsResult = await findTsConfig(ctx);
    const tsConfig = tsResult.config;
    const tsconfigPath = tsResult.path;

    if (tsConfig && tsconfigPath) {
      evidence.addConfig(
        "language-detector",
        `Found tsconfig.json at ${tsconfigPath}`,
        tsconfigPath,
      );

      if (tsConfig.strict) {
        evidence.addConfig("language-detector", "TypeScript strict mode enabled", tsconfigPath);
      }
      if (tsConfig.jsx) {
        evidence.addConfig(
          "language-detector",
          `TypeScript JSX mode: ${tsConfig.jsx}`,
          tsconfigPath,
        );
      }
      if (tsConfig.target) {
        evidence.addConfig(
          "language-detector",
          `TypeScript target: ${tsConfig.target}`,
          tsconfigPath,
        );
      }
      if (tsConfig.module) {
        evidence.addConfig(
          "language-detector",
          `TypeScript module: ${tsConfig.module}`,
          tsconfigPath,
        );
      }
      if (tsConfig.decorators) {
        evidence.addConfig(
          "language-detector",
          "TypeScript decorators enabled",
          tsconfigPath,
        );
      }
      if (tsConfig.paths) {
        evidence.addConfig(
          "language-detector",
          `TypeScript paths configured: ${Object.keys(tsConfig.paths).join(", ")}`,
          tsconfigPath,
        );
      }
      if (tsConfig.moduleResolution) {
        evidence.addConfig(
          "language-detector",
          `TypeScript moduleResolution: ${tsConfig.moduleResolution}`,
          tsconfigPath,
        );
      }
      if (tsConfig.esModuleInterop) {
        evidence.addConfig(
          "language-detector",
          "TypeScript esModuleInterop enabled",
          tsconfigPath,
        );
      }
      if (tsConfig.verbatimModuleSyntax) {
        evidence.addConfig(
          "language-detector",
          "TypeScript verbatimModuleSyntax enabled",
          tsconfigPath,
        );
      }
      if (tsConfig.isolatedModules) {
        evidence.addConfig(
          "language-detector",
          "TypeScript isolatedModules enabled",
          tsconfigPath,
        );
      }
    }

    const sourceExtensions = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([ext]) => ext);

    let confidence = 0;
    if (totalFiles > 0) {
      confidence = 75;
      if (tsconfigPath) confidence = 90;
      if (tsConfig?.strict) confidence = 95;
    } else if (tsconfigPath) {
      confidence = 40;
    }

    const reasoning = totalFiles > 0
      ? `Detected ${primary} as primary language with ${moduleSystem} module system. Found ${totalFiles} source file(s).${tsconfigPath ? ` TypeScript config found at ${tsconfigPath}.` : ""}`
      : "No source files found for language detection";

    const languageInfo: LanguageInfo = {
      primary,
      moduleSystem,
      tsconfig: tsConfig,
      tsconfigPath,
      sourceExtensions,
      fileCount: counts,
    };

    return {
      detected: totalFiles > 0 || tsconfigPath !== null,
      name: "language",
      value: languageInfo,
      version: null,
      confidence,
      evidence: evidence.getAll(),
      reasoning,
      duration: Date.now() - start,
    };
  },
};

import type {
  BuildToolInfo,
  BuildToolName,
  DetectionResult,
  DetectionContext,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";

interface BuildToolMapping {
  packageName: string;
  name: BuildToolName;
  configPatterns: string[];
}

const BUILD_TOOL_MAP: BuildToolMapping[] = [
  { packageName: "vite", name: "vite", configPatterns: ["vite.config.*"] },
  { packageName: "webpack", name: "webpack", configPatterns: ["webpack.config.*", ".webpack/*"] },
  { packageName: "rspack", name: "rspack", configPatterns: ["rspack.config.*", "rsbuild.config.*"] },
  { packageName: "rolldown", name: "rolldown", configPatterns: ["rolldown.config.*"] },
  { packageName: "rollup", name: "rollup", configPatterns: ["rollup.config.*"] },
  { packageName: "parcel", name: "parcel", configPatterns: [".parcelrc"] },
  { packageName: "esbuild", name: "esbuild", configPatterns: ["esbuild.config.*"] },
  { packageName: "tsup", name: "tsup", configPatterns: ["tsup.config.*"] },
  { packageName: "swc", name: "swc", configPatterns: [".swcrc"] },
  { packageName: "babel", name: "babel", configPatterns: [".babelrc", ".babelrc.*", "babel.config.*"] },
  { packageName: "unbuild", name: "unbuild", configPatterns: ["build.config.*"] },
  { packageName: "turbopack", name: "turbopack", configPatterns: [] },
];

function extractPlugins(config: Record<string, unknown> | null): string[] {
  if (!config) return [];

  const plugins: string[] = [];
  const rawPlugins = config.plugins;

  if (!Array.isArray(rawPlugins)) return plugins;

  for (const plugin of rawPlugins) {
    if (typeof plugin === "string") {
      plugins.push(plugin);
    } else if (typeof plugin === "object" && plugin !== null) {
      if ("name" in plugin) {
        plugins.push(String((plugin as Record<string, unknown>).name));
      }
    } else if (typeof plugin === "function") {
      plugins.push("[anonymous-plugin]");
    } else if (Array.isArray(plugin) && plugin.length > 0) {
      plugins.push(String(plugin[0]));
    }
  }

  return plugins;
}

export const detector = {
  meta: {
    name: "build-tool",
    version: "1.0.0",
    description: "Detects build tools, bundlers, and transpilers",
    author: "@vetwo",
    stage: "tooling",
    priority: 75,
    dependencies: [] as string[],
    tags: ["build", "bundler", "transpiler", "tooling"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<BuildToolInfo[]>> {
    const start = Date.now();
    const evidence = new EvidenceCollector();
    const allDeps = new Map<string, string>([
      ...ctx.dependencies,
      ...ctx.devDependencies,
    ]);

    const detectedTools: BuildToolInfo[] = [];

    for (const mapping of BUILD_TOOL_MAP) {
      const version = allDeps.get(mapping.packageName);
      if (version === undefined) continue;

      evidence.addDependency(
        "build-tool-detector",
        `Found dependency: ${mapping.packageName}@${version}`,
        mapping.packageName,
      );

      let config: Record<string, unknown> | null = null;
      let configPath: string | null = null;

      for (const pattern of mapping.configPatterns) {
        const matches = await ctx.fs.glob(pattern, ctx.root);
        const matched = matches[0];
        if (matched !== undefined) {
          configPath = matched;
          config = await ctx.fs.readJSON(matched);
          evidence.addConfig(
            "build-tool-detector",
            `Found config file: ${matched}`,
            matched,
          );
          break;
        }
      }

      const plugins = extractPlugins(config);

      if (plugins.length > 0) {
        evidence.addStructure(
          "build-tool-detector",
          `Found ${plugins.length} plugin(s) for ${mapping.name}: ${plugins.join(", ")}`,
        );
      }

      detectedTools.push({
        name: mapping.name,
        version,
        config,
        configPath,
        plugins,
      });
    }

    const detected = detectedTools.length > 0;

    let confidence = 0;
    if (detected) {
      const hasConfig = detectedTools.some(t => t.configPath !== null);
      confidence = hasConfig ? 85 : 70;

      if (detectedTools.length > 1) {
        evidence.addStructure(
          "build-tool-detector",
          `Multiple build tools detected: ${detectedTools.map(t => t.name).join(", ")}`,
        );
      }
    }

    const reasoning = detected
      ? `Detected ${detectedTools.length} build tool(s): ${detectedTools.map(t => t.name).join(", ")}`
      : "No build tools detected from package dependencies or config files";

    return {
      detected,
      name: "build-tool",
      value: detectedTools,
      version: detectedTools[0]?.version ?? null,
      confidence,
      evidence: evidence.getAll(),
      reasoning,
      duration: Date.now() - start,
    };
  },
};

import type {
  FrameworkInfo,
  FrameworkName,
  FrameworkType,
  DetectionResult,
  DetectionContext,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";

interface FrameworkMapping {
  packageName: string;
  name: FrameworkName;
  type: FrameworkType;
  configPatterns: string[];
  features: string[];
}

const FRAMEWORK_MAP: FrameworkMapping[] = [
  // Frontend
  { packageName: "react", name: "react", type: "frontend", configPatterns: [], features: ["hooks", "jsx"] },
  { packageName: "vue", name: "vue", type: "frontend", configPatterns: ["vue.config.*"], features: ["composition-api", "sfc"] },
  { packageName: "@angular/core", name: "angular", type: "frontend", configPatterns: ["angular.json", "angular-cli.json"], features: ["typescript", "decorators", "dependency-injection"] },
  { packageName: "svelte", name: "svelte", type: "frontend", configPatterns: ["svelte.config.*"], features: ["compiler", "runes"] },
  { packageName: "solid-js", name: "solid", type: "frontend", configPatterns: ["solid.config.*"], features: ["fine-grained-reactivity", "jsx"] },
  { packageName: "preact", name: "preact", type: "frontend", configPatterns: [], features: ["hooks", "jsx", "small-bundle"] },
  { packageName: "@builder.io/qwik", name: "qwik", type: "frontend", configPatterns: ["qwik.config.*"], features: ["resumability", "lazy-loading"] },

  // Meta frameworks
  { packageName: "next", name: "next", type: "meta-framework", configPatterns: ["next.config.*"], features: ["ssr", "ssg", "app-router", "pages-router", "api-routes"] },
  { packageName: "nuxt", name: "nuxt", type: "meta-framework", configPatterns: ["nuxt.config.*"], features: ["ssr", "ssg", "auto-imports", "nitro-server"] },
  { packageName: "@sveltejs/kit", name: "sveltekit", type: "meta-framework", configPatterns: ["svelte.config.*"], features: ["ssr", "ssg", "file-based-routing", "server-side-load"] },
  { packageName: "astro", name: "astro", type: "meta-framework", configPatterns: ["astro.config.*"], features: ["islands", "ssg", "content-collections"] },
  { packageName: "@remix-run/react", name: "remix", type: "meta-framework", configPatterns: ["remix.config.*"], features: ["ssr", "nested-routes", "loaders", "actions"] },
  { packageName: "gatsby", name: "gatsby", type: "meta-framework", configPatterns: ["gatsby-config.*", "gatsby-node.*"], features: ["ssg", "graphql", "plugins"] },
  { packageName: "redwoodjs", name: "redwood", type: "meta-framework", configPatterns: ["redwood.toml"], features: ["cell", "scaffold", "graphql", "serverless"] },
  { packageName: "blitzjs", name: "blitz", type: "meta-framework", configPatterns: ["blitz.config.*"], features: ["zero-api", "rpc", "auth"] },
  { packageName: "@shopify/hydrogen", name: "hydrogen", type: "meta-framework", configPatterns: ["hydrogen.config.*"], features: ["ssr", "streaming", "storefront-api"] },

  // Backend
  { packageName: "express", name: "express", type: "backend", configPatterns: [], features: ["middleware", "routing"] },
  { packageName: "fastify", name: "fastify", type: "backend", configPatterns: [], features: ["schema-validation", "plugins", "high-performance"] },
  { packageName: "@nestjs/core", name: "nestjs", type: "backend", configPatterns: ["nest-cli.json"], features: ["decorators", "dependency-injection", "modules"] },
  { packageName: "hono", name: "hono", type: "backend", configPatterns: [], features: ["edge-runtime", "web-standard", "middleware"] },
  { packageName: "koa", name: "koa", type: "backend", configPatterns: [], features: ["middleware", "streaming"] },
  { packageName: "@adonisjs/core", name: "adonisjs", type: "backend", configPatterns: ["adonisrc.*"], features: ["orm", "auth", "validation"] },
  { packageName: "elysia", name: "elysia", type: "backend", configPatterns: [], features: ["bun-native", "type-safety", "eden"] },
  { packageName: "nitro", name: "nitro", type: "backend", configPatterns: ["nitro.config.*"], features: ["server-engine", "multi-target", "storage"] },

  // Mobile/Desktop
  { packageName: "electron", name: "electron", type: "desktop", configPatterns: ["electron-builder.yml", "electron.config.*"], features: ["ipc", "native-modules", "auto-update"] },
  { packageName: "react-native", name: "react-native", type: "mobile", configPatterns: ["react-native.config.*"], features: ["native-bridge", "hermes", "metro"] },
  { packageName: "expo", name: "expo", type: "mobile", configPatterns: ["app.json", "app.config.*"], features: ["managed-workflow", "expo-modules", "expo-router"] },
  { packageName: "@ionic/core", name: "ionic", type: "mobile", configPatterns: ["ionic.config.json"], features: ["cross-platform", "capacitor", "stencil"] },
  { packageName: "@tauri-apps/api", name: "tauri", type: "desktop", configPatterns: ["tauri.conf.json", "src-tauri/*"], features: ["rust-backend", "ipc", "small-bundle"] },
  { packageName: "capacitor", name: "capacitor", type: "mobile", configPatterns: ["capacitor.config.*"], features: ["native-bridge", "plugins", "cross-platform"] },
];

export const detector = {
  meta: {
    name: "framework",
    version: "1.0.0",
    description: "Detects frontend, backend, meta-framework, and mobile/desktop frameworks",
    author: "@vetwo",
    stage: "frameworks",
    priority: 80,
    dependencies: [] as string[],
    tags: ["framework", "frontend", "backend", "meta-framework", "mobile", "desktop"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<FrameworkInfo[]>> {
    const start = Date.now();
    const evidence = new EvidenceCollector();
    const allDeps = new Map<string, string>([
      ...ctx.dependencies,
      ...ctx.devDependencies,
    ]);

    const detectedFrameworks: FrameworkInfo[] = [];

    for (const mapping of FRAMEWORK_MAP) {
      const version = allDeps.get(mapping.packageName);
      if (version === undefined) continue;

      evidence.addDependency(
        "framework-detector",
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
            "framework-detector",
            `Found config file: ${matched}`,
            matched,
          );
          break;
        }
      }

      const features = [...mapping.features];
      if (ctx.configFiles.has("tsconfig.json")) {
        features.push("typescript");
      }

      detectedFrameworks.push({
        name: mapping.name,
        type: mapping.type,
        version,
        features,
        config,
        configPath,
      });
    }

    const detected = detectedFrameworks.length > 0;

    let confidence = 0;
    if (detected) {
      confidence = detectedFrameworks[0]!.configPath ? 85 : 70;

      if (detectedFrameworks.length > 1) {
        evidence.addStructure(
          "framework-detector",
          `Multiple frameworks detected: ${detectedFrameworks.map(f => f.name).join(", ")}`,
        );
      }
    }

    const reasoning = detected
      ? `Detected ${detectedFrameworks.length} framework(s): ${detectedFrameworks.map(f => `${f.name} (${f.type})`).join(", ")}`
      : "No frameworks detected from package dependencies or config files";

    return {
      detected,
      name: "framework",
      value: detectedFrameworks,
      version: detectedFrameworks[0]?.version ?? null,
      confidence,
      evidence: evidence.getAll(),
      reasoning,
      duration: Date.now() - start,
    };
  },
};

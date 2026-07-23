import type {
  DetectionResult,
  DetectionContext,
  RuntimeInfo,
  RuntimeName,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";

interface ProcessVersions {
  node?: string;
  bun?: string;
  electron?: string;
  chrome?: string;
  v8?: string;
  uv?: string;
  zlib?: string;
  modules?: string;
  webpack?: string;
}

interface ProcessWithVersions {
  versions?: ProcessVersions;
  env?: Record<string, string | undefined>;
  platform?: string;
  arch?: string;
  pid?: number;
}

declare const process: ProcessWithVersions;
declare const globalThis: Record<string, unknown>;

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

const RUNTIME_CONFIG_FILES: Record<string, RuntimeName> = {
  "electron-builder.yml": "electron",
  "electron-builder.json": "electron",
  "electron-builder.json5": "electron",
  ".taurignore": "tauri",
  "tauri.conf.json": "tauri",
  "expo-plugin": "expo",
  "app.json": "expo",
  ".expo": "expo",
  "capacitor.config.ts": "capacitor",
  "capacitor.config.js": "capacitor",
  "capacitor.config.json": "capacitor",
  "wrangler.toml": "cloudflare-workers",
  "wrangler.json": "cloudflare-workers",
  "netlify.toml": "netlify-edge",
  "vercel.json": "vercel-edge",
  "fastly.toml": "fastly-compute",
  "package.json": "nw.js",
};

const RUNTIME_DEP_PATTERNS: Array<{ pattern: RegExp; runtime: RuntimeName }> = [
  { pattern: /^react-native$/i, runtime: "react-native" },
  { pattern: /^expo$/i, runtime: "expo" },
  { pattern: /^electron$/i, runtime: "electron" },
  { pattern: /^@tauri-apps\/api$/i, runtime: "tauri" },
  { pattern: /^@tauri-apps\/cli$/i, runtime: "tauri" },
  { pattern: /^@capacitor\/.*$/i, runtime: "capacitor" },
  { pattern: /^nw$/i, runtime: "nw.js" },
  { pattern: /^nw-builder$/i, runtime: "nw.js" },
];

const NODE_CAPABILITIES = [
  "file-system",
  "child-process",
  "networking",
  "crypto",
  "streams",
  "worker-threads",
  "native-modules",
];

const BUN_CAPABILITIES = [
  "file-system",
  "child-process",
  "networking",
  "crypto",
  "streams",
  "worker-threads",
  "bun-native",
  "sqlite",
  "s3",
];

const DENO_CAPABILITIES = [
  "file-system",
  "child-process",
  "networking",
  "crypto",
  "streams",
  "web-apis",
  "deno-native",
  "permissions",
];

function detectGlobalRuntime(): RuntimeName | null {
  if (typeof globalThis.Deno !== "undefined") return "deno";
  if (typeof process !== "undefined") {
    if (process.versions?.bun) return "bun";
    if (process.versions?.electron) return "electron";
    if (process.versions?.node) return "node";
  }
  return null;
}

function detectEnvironment(): string | null {
  if (typeof process !== "undefined" && process.env) {
    if (process.env.TERM_PROGRAM) return process.env.TERM_PROGRAM;
    if (process.env.VERCEL) return "vercel-edge";
    if (process.env.CF_WORKERS) return "cloudflare-workers";
    if (process.env.NETLIFY) return "netlify-edge";
    if (process.env.FASTLY) return "fastly-compute";
    if (process.env.ELECTRON_RUN_AS_NODE) return "electron";
    if (process.env.EXPO_CLI) return "expo";
    if (process.env.CAPACITOR) return "capacitor";
  }
  return null;
}

function detectCapabilities(runtime: RuntimeName): string[] {
  switch (runtime) {
    case "node":
      return [...NODE_CAPABILITIES];
    case "bun":
      return [...BUN_CAPABILITIES];
    case "deno":
      return [...DENO_CAPABILITIES];
    case "electron":
      return [...NODE_CAPABILITIES, "gui", "ipc", "browser-context"];
    case "react-native":
      return ["javascript", "bridge", "native-modules", "hot-reload"];
    case "expo":
      return ["javascript", "bridge", "native-modules", "hot-reload", "expo-apis"];
    case "browser":
      return ["dom", "fetch", "web-apis", "web-workers", "service-workers"];
    case "cloudflare-workers":
      return ["fetch", "web-apis", "web-workers", "kv-storage", "durable-objects"];
    case "vercel-edge":
      return ["fetch", "web-apis", "edge-functions"];
    case "netlify-edge":
      return ["fetch", "web-apis", "edge-functions"];
    case "fastly-compute":
      return ["fetch", "web-apis", "edge-compute", "wasm"];
    case "tauri":
      return ["gui", "system-access", "ipc", "file-system", "native-webview"];
    case "capacitor":
      return ["javascript", "bridge", "native-modules", "cross-platform"];
    case "nw.js":
      return ["gui", "node-apis", "browser-context", "file-system"];
    default:
      return [];
  }
}

function detectCompatibility(runtime: RuntimeName): string[] {
  switch (runtime) {
    case "node":
      return ["npm", "commonjs", "esm", "native-modules"];
    case "bun":
      return ["npm", "yarn", "pnpm", "commonjs", "esm", "deno-modules"];
    case "deno":
      return ["npm", "url-imports", "esm", "web-apis"];
    case "electron":
      return ["node", "chromium", "npm", "commonjs", "esm"];
    case "react-native":
      return ["react", "ios", "android", "hermes"];
    case "expo":
      return ["react", "ios", "android", "expo-go", "eas"];
    case "browser":
      return ["esm", "web-apis", "service-workers"];
    case "cloudflare-workers":
      return ["esm", "web-apis", "workers-runtime"];
    case "vercel-edge":
      return ["esm", "web-apis", "next.js", "remix"];
    case "netlify-edge":
      return ["esm", "web-apis", "next.js", "remix"];
    case "fastly-compute":
      return ["esm", "web-apis", "wasm"];
    case "tauri":
      return ["rust", "webview", "system-api"];
    case "capacitor":
      return ["ionic", "ios", "android", "electron"];
    case "nw.js":
      return ["node", "chromium", "npm", "commonjs", "esm"];
    default:
      return [];
  }
}

function getRuntimeVersion(runtime: RuntimeName): string | null {
  if (typeof process === "undefined" || !process.versions) return null;
  switch (runtime) {
    case "node":
      return process.versions.node ?? null;
    case "bun":
      return process.versions.bun ?? null;
    case "deno":
      return typeof globalThis.Deno === "object" &&
        globalThis.Deno !== null &&
        "version" in globalThis.Deno &&
        typeof (globalThis.Deno as { version?: { deno?: string } }).version === "object"
        ? (globalThis.Deno as { version: { deno?: string } }).version.deno ?? null
        : null;
    case "electron":
      return process.versions.electron ?? null;
    default:
      return null;
  }
}

export const detector = {
  meta: {
    name: "runtime",
    version: "1.0.0",
    description: "Detects the JavaScript/TypeScript runtime environment",
    author: "@vetwo",
    stage: "runtime",
    priority: 100,
    dependencies: [] as string[],
    tags: ["runtime", "node", "bun", "deno", "electron", "edge", "mobile"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<RuntimeInfo>> {
    const start = Date.now();
    const evidence = new EvidenceCollector();
    let runtime: RuntimeName = "unknown";
    let confidence = 0;
    const reasons: string[] = [];

    // 1. Check globalThis / process for direct runtime globals
    const globalRuntime = detectGlobalRuntime();
    if (globalRuntime) {
      runtime = globalRuntime;
      confidence = 100;
      reasons.push(`Detected ${globalRuntime} via runtime globals`);
      evidence.addEnv("runtime-detector", `process.versions indicates ${globalRuntime}`);
    }

    // 2. Check environment variables
    const envRuntime = detectEnvironment();
    if (envRuntime && runtime === "unknown") {
      runtime = envRuntime as RuntimeName;
      confidence = 90;
      reasons.push(`Detected ${envRuntime} via environment variable`);
      evidence.addEnv("runtime-detector", `Environment variable indicates ${envRuntime}`);
    } else if (envRuntime) {
      evidence.addEnv("runtime-detector", `Environment variable confirms ${envRuntime}`);
    }

    // 3. Check package.json dependencies
    const pkg = ctx.packageJson as PackageJson | null;
    const allDeps = new Map<string, string>([
      ...ctx.dependencies,
      ...ctx.devDependencies,
    ]);

    for (const { pattern, runtime: depRuntime } of RUNTIME_DEP_PATTERNS) {
      for (const depName of allDeps.keys()) {
        if (pattern.test(depName)) {
          if (runtime === "unknown") {
            runtime = depRuntime;
            confidence = Math.max(confidence, 85);
            reasons.push(`Detected ${depRuntime} via dependency "${depName}"`);
            evidence.addDependency("runtime-detector", `Dependency "${depName}" indicates ${depRuntime}`, depName);
          } else if (runtime === depRuntime) {
            confidence = Math.min(100, confidence + 5);
            evidence.addDependency("runtime-detector", `Dependency "${depName}" confirms ${depRuntime}`, depName);
          }
        }
      }
    }

    // 4. Check for dependency group indicators (react-native + react)
    if (runtime === "unknown") {
      const hasReact = allDeps.has("react");
      const hasReactNative = allDeps.has("react-native");
      const hasExpo = allDeps.has("expo");
      if (hasReact && hasReactNative) {
        runtime = "react-native";
        confidence = 80;
        reasons.push("Detected react-native via react + react-native dependencies");
        evidence.addDependency("runtime-detector", "Dependencies include react and react-native");
      } else if (hasReact && hasExpo) {
        runtime = "expo";
        confidence = 80;
        reasons.push("Detected expo via react + expo dependencies");
        evidence.addDependency("runtime-detector", "Dependencies include react and expo");
      }
    }

    // 5. Check config files
    for (const [configFile, configRuntime] of Object.entries(RUNTIME_CONFIG_FILES)) {
      if (configFile === "package.json") continue;

      const configData = ctx.configFiles.get(configFile);
      if (configData) {
        if (runtime === "unknown") {
          runtime = configRuntime;
          confidence = Math.max(confidence, 75);
          reasons.push(`Detected ${configRuntime} via config file "${configFile}"`);
          evidence.addConfig("runtime-detector", `Config file "${configFile}" indicates ${configRuntime}`, configFile);
        } else if (runtime === configRuntime) {
          confidence = Math.min(100, confidence + 5);
          evidence.addConfig("runtime-detector", `Config file "${configFile}" confirms ${configRuntime}`, configFile);
        }
      }

      const exists = await ctx.fs.exists(`${ctx.root}/${configFile}`);
      if (exists) {
        if (runtime === "unknown") {
          runtime = configRuntime;
          confidence = Math.max(confidence, 75);
          reasons.push(`Detected ${configRuntime} via config file "${configFile}"`);
          evidence.addFile("runtime-detector", `Found config file "${configFile}"`, configFile);
        } else if (runtime === configRuntime) {
          confidence = Math.min(100, confidence + 5);
          evidence.addFile("runtime-detector", `Found config file "${configFile}"`, configFile);
        }
      }
    }

    // 6. Check lockfiles for edge runtime indicators
    for (const lockfile of ctx.lockfiles) {
      if (lockfile.includes("wrangler")) {
        if (runtime === "unknown") {
          runtime = "cloudflare-workers";
          confidence = 70;
          reasons.push("Detected cloudflare-workers via wrangler lockfile");
          evidence.addLockfile("runtime-detector", "Wrangler lockfile found", lockfile);
        }
      }
    }

    // 7. Check previous results for clues
    const prevFramework = ctx.previousResults.get("framework-detector");
    if (prevFramework?.detected) {
      const fwName = prevFramework.name;
      if (fwName === "next" || fwName === "remix" || fwName === "astro") {
        if (runtime === "unknown") {
          runtime = "node";
          confidence = Math.max(confidence, 60);
          reasons.push(`Inferred node from meta-framework "${fwName}"`);
          evidence.addStructure("runtime-detector", `Meta-framework "${fwName}" typically runs on Node.js`);
        }
      }
    }

    // 8. Browser detection fallback
    if (runtime === "unknown") {
      const hasWindow = typeof globalThis.window !== "undefined";
      const hasDocument = typeof globalThis.document !== "undefined";
      if (hasWindow && hasDocument) {
        runtime = "browser";
        confidence = 95;
        reasons.push("Detected browser via window and document globals");
        evidence.addEnv("runtime-detector", "window and document globals indicate browser environment");
      }
    }

    // Build capabilities and compatibility
    const capabilities = detectCapabilities(runtime);
    const compatibility = detectCompatibility(runtime);
    const version = getRuntimeVersion(runtime);

    if (runtime === "unknown") {
      confidence = 0;
      reasons.push("No runtime could be identified");
    }

    const value: RuntimeInfo = {
      name: runtime,
      version,
      capabilities,
      compatibility,
      executionEnvironment: envRuntime,
    };

    return {
      detected: runtime !== "unknown",
      name: "runtime",
      value,
      version,
      confidence,
      evidence: evidence.getAll(),
      reasoning: reasons.join("; ") || "No runtime detected",
      duration: Date.now() - start,
    };
  },
};

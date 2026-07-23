import type {
  DetectionResult,
  DetectionContext,
  PackageManagerInfo,
  PackageManagerName,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";

interface PackageJson {
  packageManager?: string;
  scripts?: Record<string, string>;
}

interface ModulesYaml {
  node_modules?: Record<string, unknown>;
  packageManager?: string;
}

interface YarnState {
  __global?: unknown;
}

const LOCKFILE_MAP: Record<string, PackageManagerName> = {
  "package-lock.json": "npm",
  "npm-shrinkwrap.json": "npm",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "bun.lock": "bun",
  "bun.lockb": "bun",
  "deno.lock": "deno",
  "deno.lock.json": "deno",
};

const CACHE_DIRS: Record<PackageManagerName, string> = {
  npm: "~/.npm",
  pnpm: "~/.local/share/pnpm/store",
  yarn: "~/.cache/yarn",
  "yarn-classic": "~/.cache/yarn",
  "yarn-berry": ".yarn/cache",
  bun: "~/.bun/install/cache",
  deno: "~/.deno",
  unknown: "",
};

function parsePackageManagerField(field: string): { name: PackageManagerName; version: string | null } {
  const atIdx = field.lastIndexOf("@");
  if (atIdx <= 0) return { name: field as PackageManagerName, version: null };
  const name = field.slice(0, atIdx) as PackageManagerName;
  const version = field.slice(atIdx + 1);
  return { name, version };
}

function isYarnBerry(config: PackageJson | null, pkgRoot: string, pkgJson: Record<string, unknown> | null): boolean {
  // Yarn berry uses .yarn directory with release or pnp
  if (pkgJson && typeof pkgJson === "object") {
    const installConfig = pkgJson.installConfig as Record<string, string> | undefined;
    if (installConfig?.nodeLinker === "pnp") return true;
  }

  // Check packageManager field
  if (config?.packageManager?.startsWith("yarn@")) {
    const version = config.packageManager.split("@")[1];
    if (version && !version.startsWith("1.")) return true;
  }

  return false;
}

function detectInstallStrategy(
  pm: PackageManagerName,
  config: PackageJson | null,
  pkgJson: Record<string, unknown> | null,
): string | null {
  if (pm === "pnpm") {
    return "content-addressable";
  }

  if (pm === "yarn" || pm === "yarn-berry") {
    if (pkgJson && typeof pkgJson === "object") {
      const installConfig = pkgJson.installConfig as Record<string, string> | undefined;
      if (installConfig?.nodeLinker === "pnp") return "plug'n'play";
      if (installConfig?.nodeLinker === "node-modules") return "node-modules (yarn)";
    }
    return "node-linker";
  }

  if (pm === "npm") return "node-modules";
  if (pm === "bun") return "hardlink";
  if (pm === "deno") return "global-cache";

  return null;
}

export const detector = {
  meta: {
    name: "package-manager",
    version: "1.0.0",
    description: "Detects the package manager used by the project",
    author: "@vetwo",
    stage: "package-manager",
    priority: 90,
    dependencies: [] as string[],
    tags: ["package-manager", "npm", "pnpm", "yarn", "bun", "deno"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<PackageManagerInfo>> {
    const start = Date.now();
    const evidence = new EvidenceCollector();
    let pm: PackageManagerName = "unknown";
    let version: string | null = null;
    let lockfile: string | null = null;
    let confidence = 0;
    const reasons: string[] = [];

    const pkg = ctx.packageJson as PackageJson | null;

    // 1. Check packageJson.packageManager field (highest confidence)
    if (pkg?.packageManager) {
      const parsed = parsePackageManagerField(pkg.packageManager);
      if (parsed.name && parsed.name !== "unknown") {
        pm = parsed.name;
        version = parsed.version;
        confidence = 100;
        reasons.push(`packageManager field: "${pkg.packageManager}"`);
        evidence.addConfig(
          "package-manager-detector",
          `package.json "packageManager" field: "${pkg.packageManager}"`,
          "package.json",
        );
      }
    }

    // 2. Check lockfiles (high confidence)
    const lockfilePriority: PackageManagerName[] = ["pnpm", "yarn", "bun", "npm", "deno"];
    for (const lf of ctx.lockfiles) {
      const basename = lf.split("/").pop() ?? lf;
      const detected = LOCKFILE_MAP[basename];
      if (detected) {
        lockfile = basename;
        if (pm === "unknown" || (pm === "yarn" && detected === "yarn")) {
          pm = detected;
          if (confidence < 90) confidence = 90;
          reasons.push(`Lockfile "${basename}" found`);
          evidence.addLockfile("package-manager-detector", `Lockfile "${basename}" indicates ${detected}`, basename);
        }
      }
    }

    // 3. Check pnpm-specific indicators
    if (pm === "unknown" || pm === "pnpm") {
      const modulesYaml = ctx.configFiles.get("node_modules/.modules.yaml") as ModulesYaml | undefined;
      if (modulesYaml) {
        pm = "pnpm";
        if (confidence < 85) confidence = 85;
        reasons.push("Detected pnpm via node_modules/.modules.yaml");
        evidence.addFile(
          "package-manager-detector",
          "node_modules/.modules.yaml found (pnpm indicator)",
          "node_modules/.modules.yaml",
        );

        if (modulesYaml.packageManager) {
          version = modulesYaml.packageManager;
        }
      }

      const modulesYamlExists = await ctx.fs.exists(`${ctx.root}/node_modules/.modules.yaml`);
      if (modulesYamlExists) {
        const content = await ctx.fs.readFile(`${ctx.root}/node_modules/.modules.yaml`);
        if (content) {
          pm = "pnpm";
          if (confidence < 85) confidence = 85;
          reasons.push("Detected pnpm via node_modules/.modules.yaml");
          evidence.addFile(
            "package-manager-detector",
            "node_modules/.modules.yaml found (pnpm indicator)",
            "node_modules/.modules.yaml",
          );
        }
      }
    }

    // 4. Check yarn berry indicators
    if (pm === "unknown" || pm === "yarn") {
      const yarnStateExists = await ctx.fs.exists(`${ctx.root}/.yarn-state.yml`);
      if (yarnStateExists) {
        pm = "yarn-berry";
        if (confidence < 85) confidence = 85;
        reasons.push("Detected yarn berry via .yarn-state.yml");
        evidence.addFile(
          "package-manager-detector",
          ".yarn-state.yml found (yarn berry indicator)",
          ".yarn-state.yml",
        );
      }

      const pnpFile = await ctx.fs.exists(`${ctx.root}/.pnp.cjs`);
      if (pnpFile) {
        pm = "yarn-berry";
        if (confidence < 85) confidence = 85;
        reasons.push("Detected yarn berry via .pnp.cjs");
        evidence.addFile(
          "package-manager-detector",
          ".pnp.cjs found (yarn berry PnP indicator)",
          ".pnp.cjs",
        );
      }

      const yarnrcExists = await ctx.fs.exists(`${ctx.root}/.yarnrc.yml`);
      if (yarnrcExists) {
        if (pm === "unknown") {
          pm = "yarn-berry";
          if (confidence < 80) confidence = 80;
          reasons.push("Detected yarn berry via .yarnrc.yml");
          evidence.addFile(
            "package-manager-detector",
            ".yarnrc.yml found (yarn berry config)",
            ".yarnrc.yml",
          );
        }
      }
    }

    // 5. Check bun indicators
    if (pm === "unknown") {
      const bunIndicators = ["bun.lock", "bun.lockb"];
      for (const indicator of bunIndicators) {
        const exists = await ctx.fs.exists(`${ctx.root}/${indicator}`);
        if (exists) {
          pm = "bun";
          lockfile = indicator;
          if (confidence < 85) confidence = 85;
          reasons.push(`Detected bun via "${indicator}"`);
          evidence.addFile("package-manager-detector", `Found "${indicator}"`, indicator);
          break;
        }
      }
    }

    // 6. Check for deno.lock
    if (pm === "unknown") {
      const denoLock = await ctx.fs.exists(`${ctx.root}/deno.lock`);
      if (denoLock) {
        pm = "deno";
        lockfile = "deno.lock";
        if (confidence < 85) confidence = 85;
        reasons.push("Detected deno via deno.lock");
        evidence.addFile("package-manager-detector", "Found deno.lock", "deno.lock");
      }
    }

    // 7. Differentiate yarn classic vs berry
    if (pm === "yarn") {
      if (isYarnBerry(pkg, ctx.root, ctx.packageJson)) {
        pm = "yarn-berry";
        reasons.push("Yarn detected as berry (modern) via configuration");
      } else {
        pm = "yarn-classic";
        reasons.push("Yarn detected as classic (v1)");
      }
    }

    // 8. Infer from scripts if still unknown
    if (pm === "unknown" && pkg?.scripts) {
      const scriptKeys = Object.keys(pkg.scripts);
      if (scriptKeys.some(k => k.includes("expo") || k.includes("react-native"))) {
        pm = "npm";
        confidence = 50;
        reasons.push("Inferred npm from project scripts (default for JS projects)");
        evidence.addStructure("package-manager-detector", "Scripts suggest npm as default package manager");
      }
    }

    // 9. Fallback: default to npm for Node.js projects
    if (pm === "unknown") {
      const hasNodeModules = await ctx.fs.exists(`${ctx.root}/node_modules`);
      if (hasNodeModules) {
        pm = "npm";
        confidence = 40;
        reasons.push("Inferred npm: node_modules present without clear PM indicators");
        evidence.addStructure(
          "package-manager-detector",
          "node_modules directory present, defaulting to npm",
        );
      }
    }

    // Build cache directory
    const cacheDir = CACHE_DIRS[pm] || null;

    // Determine workspace support
    const workspaceSupport = pm !== "unknown" && pm !== "deno";

    // Detect install strategy
    const installStrategy = detectInstallStrategy(pm, pkg, ctx.packageJson);

    // If we only found a lockfile but no version, try to read it for version hints
    if (version === null && lockfile) {
      const lockfilePath = ctx.lockfiles.find(l => l.endsWith(lockfile ?? ""));
      if (lockfilePath) {
        const content = await ctx.fs.readFile(lockfilePath);
        if (content) {
          // Try to extract version from lockfile content
          if (pm === "npm" && content.includes('"lockfileVersion":')) {
            const match = content.match(/"lockfileVersion":\s*(\d+)/);
            if (match) {
              version = `lockfile-v${match[1]}`;
              evidence.addLockfile(
                "package-manager-detector",
                `npm lockfile version: ${match[1]}`,
                lockfile,
              );
            }
          }
        }
      }
    }

    const value: PackageManagerInfo = {
      name: pm,
      version,
      lockfile,
      cacheDir,
      workspaceSupport,
      installStrategy,
    };

    return {
      detected: pm !== "unknown",
      name: "package-manager",
      value,
      version,
      confidence,
      evidence: evidence.getAll(),
      reasoning: reasons.join("; ") || "No package manager detected",
      duration: Date.now() - start,
    };
  },
};

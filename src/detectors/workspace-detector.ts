import * as nodePath from "node:path";
import type {
  DetectionResult,
  DetectionContext,
  WorkspaceInfo,
  WorkspaceType,
  WorkspacePackage,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";

interface PackageJson {
  workspaces?: string[] | { packages?: string[]; nohoist?: string[] };
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface PnpmWorkspace {
  packages?: string[];
}

interface TurboJson {
  globalDependencies?: string[];
  tasks?: Record<string, unknown>;
}

interface NxJson {
  projects?: Record<string, unknown>;
  defaultProject?: string;
}

interface LernaJson {
  packages?: string[];
  version?: string;
  useWorkspaces?: boolean;
}

interface RushJson {
  projects?: Array<{ packageName: string; projectFolder: string; versionPolicyName?: string }>;
}

interface MoonYaml {
  projects?: string[] | Record<string, string>;
}

interface LageJson {
  projects?: string[];
}

const WORKSPACE_CONFIG_DETECTION: Array<{
  file: string;
  type: WorkspaceType;
  parse?: (data: Record<string, unknown>) => { globs?: string[]; detail?: string };
}> = [
  {
    file: "turbo.json",
    type: "turborepo",
    parse: (data) => ({
      detail: "Turborepo configuration found",
    }),
  },
  {
    file: "nx.json",
    type: "nx",
    parse: (data) => {
      const nxData = data as unknown as NxJson;
      return {
        detail: nxData.defaultProject
          ? `Nx workspace with default project: ${nxData.defaultProject}`
          : "Nx configuration found",
      };
    },
  },
  {
    file: "lerna.json",
    type: "lerna",
    parse: (data) => {
      const lernaData = data as unknown as LernaJson;
      return {
        globs: lernaData.packages,
        detail: lernaData.useWorkspaces
          ? "Lerna using npm/yarn workspaces"
          : "Lerna configuration found",
      };
    },
  },
  {
    file: "rush.json",
    type: "rush",
    parse: (data) => {
      const rushData = data as unknown as RushJson;
      return {
        detail: rushData.projects
          ? `Rush workspace with ${rushData.projects.length} projects`
          : "Rush configuration found",
      };
    },
  },
  {
    file: "moon.yml",
    type: "moonrepo",
    parse: () => ({
      detail: "Moonrepo configuration found",
    }),
  },
  {
    file: "lage.json",
    type: "lage",
    parse: (data) => {
      const lageData = data as unknown as LageJson;
      return {
        globs: lageData.projects,
        detail: "Lage configuration found",
      };
    },
  },
  {
    file: "pnpm-workspace.yaml",
    type: "pnpm-workspace",
    parse: (data) => {
      const pnpmData = data as unknown as PnpmWorkspace;
      return {
        globs: pnpmData.packages,
        detail: pnpmData.packages
          ? `pnpm workspace with ${pnpmData.packages.length} patterns`
          : "pnpm workspace configuration found",
      };
    },
  },
];

function getWorkspaceGlobsFromPkg(pkg: PackageJson): string[] | null {
  if (Array.isArray(pkg.workspaces)) {
    return pkg.workspaces;
  }
  if (pkg.workspaces && typeof pkg.workspaces === "object" && "packages" in pkg.workspaces) {
    return pkg.workspaces.packages ?? null;
  }
  return null;
}

async function resolveWorkspacePackages(
  globs: string[],
  root: string,
  fs: DetectionContext["fs"],
): Promise<WorkspacePackage[]> {
  const packages: WorkspacePackage[] = [];

  for (const globPattern of globs) {
    // Expand the glob pattern: "packages/*" -> list directories
    const dirPattern = globPattern.replace(/\*+$/, "");
    const parentDir = nodePath.join(root, dirPattern);

    const exists = await fs.exists(parentDir);
    if (!exists) continue;

    const entries = await fs.readDir(parentDir);
    for (const entry of entries) {
      const pkgPath = nodePath.join(parentDir, entry);
      const pkgJsonPath = nodePath.join(pkgPath, "package.json");

      const pkgJson = await fs.readJSON(pkgJsonPath);
      if (!pkgJson) continue;

      const name = typeof pkgJson.name === "string" ? pkgJson.name : entry;
      const version = typeof pkgJson.version === "string" ? pkgJson.version : null;

      const deps = pkgJson.dependencies && typeof pkgJson.dependencies === "object"
        ? Object.keys(pkgJson.dependencies as Record<string, string>)
        : [];
      const devDeps = pkgJson.devDependencies && typeof pkgJson.devDependencies === "object"
        ? Object.keys(pkgJson.devDependencies as Record<string, string>)
        : [];

      packages.push({
        name,
        path: pkgPath,
        version,
        dependencies: deps,
        devDependencies: devDeps,
      });
    }
  }

  return packages;
}

function buildDependencyGraph(packages: WorkspacePackage[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  const packageNames = new Set(packages.map(p => p.name));

  for (const pkg of packages) {
    const internalDeps = [
      ...pkg.dependencies.filter(d => packageNames.has(d)),
      ...pkg.devDependencies.filter(d => packageNames.has(d)),
    ];
    graph.set(pkg.name, internalDeps);
  }

  return graph;
}

function classifyPackages(
  packages: WorkspacePackage[],
): { apps: WorkspacePackage[]; libs: WorkspacePackage[] } {
  const apps: WorkspacePackage[] = [];
  const libs: WorkspacePackage[] = [];

  for (const pkg of packages) {
    // Heuristic: if the package name contains "app" or "apps", it's likely an app
    // If it contains "lib", "package", "shared", "utils", it's likely a lib
    // Otherwise default to lib
    const lowerName = pkg.name.toLowerCase();
    const isApp =
      lowerName.includes("app") ||
      lowerName.includes("demo") ||
      lowerName.includes("example") ||
      lowerName.includes("website") ||
      lowerName.includes("web") ||
      lowerName.includes("api") ||
      lowerName.includes("server") ||
      lowerName.includes("cli");

    if (isApp) {
      apps.push(pkg);
    } else {
      libs.push(pkg);
    }
  }

  return { apps, libs };
}

async function detectFromPreviousResults(
  ctx: DetectionContext,
  evidence: EvidenceCollector,
): Promise<{ type: WorkspaceType; globs: string[] | null; detail: string } | null> {
  const turboResult = ctx.previousResults.get("turborepo-detector");
  if (turboResult?.detected) {
    return { type: "turborepo", globs: null, detail: "Turborepo detected in previous run" };
  }

  const nxResult = ctx.previousResults.get("nx-detector");
  if (nxResult?.detected) {
    return { type: "nx", globs: null, detail: "Nx detected in previous run" };
  }

  return null;
}

export const detector = {
  meta: {
    name: "workspace",
    version: "1.0.0",
    description: "Detects monorepo workspace tooling and structure",
    author: "@vetwo",
    stage: "workspace",
    priority: 85,
    dependencies: [] as string[],
    tags: ["workspace", "monorepo", "turborepo", "nx", "lerna", "pnpm", "yarn", "npm"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<WorkspaceInfo>> {
    const start = Date.now();
    const evidence = new EvidenceCollector();
    let wsType: WorkspaceType = "none";
    let globs: string[] | null = null;
    let confidence = 0;
    const reasons: string[] = [];

    // 1. Check dedicated config files (highest priority)
    for (const { file, type, parse } of WORKSPACE_CONFIG_DETECTION) {
      const configData = ctx.configFiles.get(file);
      if (configData) {
        wsType = type;
        confidence = 95;
        const parsed = parse ? parse(configData) : undefined;
        globs = parsed?.globs ?? null;
        reasons.push(parsed?.detail ?? `${type} config file "${file}" found`);
        evidence.addConfig("workspace-detector", `${type} config found: "${file}"`, file);
        break;
      }

      const exists = await ctx.fs.exists(`${ctx.root}/${file}`);
      if (exists) {
        wsType = type;
        confidence = 95;
        const fileData = await ctx.fs.readJSON(`${ctx.root}/${file}`);
        const parsed = parse && fileData ? parse(fileData) : undefined;
        globs = parsed?.globs ?? null;
        reasons.push(parsed?.detail ?? `${type} config file "${file}" found`);
        evidence.addFile("workspace-detector", `${type} config found: "${file}"`, file);
        break;
      }
    }

    // 2. Check package.json workspaces field
    if (wsType === "none") {
      const pkg = ctx.packageJson as PackageJson | null;
      if (pkg) {
        const pkgGlobs = getWorkspaceGlobsFromPkg(pkg);
        if (pkgGlobs && pkgGlobs.length > 0) {
          globs = pkgGlobs;

          // Determine which PM's workspaces format this is
          const pmResult = ctx.previousResults.get("package-manager-detector");
          const pmName = pmResult?.value && typeof pmResult.value === "object" && "name" in pmResult.value
            ? (pmResult.value as { name: string }).name
            : null;

          if (pmName === "pnpm") {
            wsType = "pnpm-workspace";
          } else if (pmName === "yarn" || pmName === "yarn-classic" || pmName === "yarn-berry") {
            wsType = "yarn-workspace";
          } else if (pmName === "npm") {
            wsType = "npm-workspace";
          } else {
            // Default: if we can't determine the PM, check for pnpm-workspace.yaml
            const hasPnpm = await ctx.fs.exists(`${ctx.root}/pnpm-workspace.yaml`);
            if (hasPnpm) {
              wsType = "pnpm-workspace";
            } else {
              wsType = "npm-workspace";
            }
          }

          confidence = 85;
          reasons.push(`package.json workspaces field with ${pkgGlobs.length} pattern(s)`);
          evidence.addConfig(
            "workspace-detector",
            `package.json "workspaces" field: ${JSON.stringify(pkgGlobs)}`,
            "package.json",
          );
        }
      }
    }

    // 3. Check for yarn workspaces via yarn.lock + workspaces
    if (wsType === "none") {
      const hasYarnLock = ctx.lockfiles.some(l => l.endsWith("yarn.lock"));
      if (hasYarnLock) {
        const pkg = ctx.packageJson as PackageJson | null;
        const pkgGlobs = pkg ? getWorkspaceGlobsFromPkg(pkg) : null;
        if (pkgGlobs && pkgGlobs.length > 0) {
          wsType = "yarn-workspace";
          globs = pkgGlobs;
          confidence = 80;
          reasons.push("Detected yarn workspace via yarn.lock + package.json workspaces");
          evidence.addLockfile("workspace-detector", "yarn.lock indicates yarn workspace", "yarn.lock");
        }
      }
    }

    // 4. Check previous results
    if (wsType === "none") {
      const prev = await detectFromPreviousResults(ctx, evidence);
      if (prev) {
        wsType = prev.type;
        globs = prev.globs;
        confidence = 75;
        reasons.push(prev.detail);
      }
    }

    // 5. Try to resolve workspace packages if globs are available
    let packages: WorkspacePackage[] = [];
    if (globs && globs.length > 0) {
      packages = await resolveWorkspacePackages(globs, ctx.root, ctx.fs);
      if (packages.length > 0) {
        evidence.addStructure(
          "workspace-detector",
          `Resolved ${packages.length} workspace package(s) from ${globs.length} pattern(s)`,
        );
      }
    }

    // 6. If no globs but we detected a type, try to discover packages via common paths
    if (packages.length === 0 && wsType !== "none" && wsType !== "custom") {
      const commonPaths = ["packages", "apps", "libs", "modules", "services"];
      for (const commonPath of commonPaths) {
        const dirExists = await ctx.fs.exists(`${ctx.root}/${commonPath}`);
        if (dirExists) {
          const entries = await ctx.fs.readDir(`${ctx.root}/${commonPath}`);
          for (const entry of entries) {
            const pkgJsonPath = `${ctx.root}/${commonPath}/${entry}/package.json`;
            const pkgJson = await ctx.fs.readJSON(pkgJsonPath);
            if (pkgJson) {
              const name = typeof pkgJson.name === "string" ? pkgJson.name : entry;
              const version = typeof pkgJson.version === "string" ? pkgJson.version : null;
              const deps = pkgJson.dependencies && typeof pkgJson.dependencies === "object"
                ? Object.keys(pkgJson.dependencies as Record<string, string>)
                : [];
              const devDeps = pkgJson.devDependencies && typeof pkgJson.devDependencies === "object"
                ? Object.keys(pkgJson.devDependencies as Record<string, string>)
                : [];

              packages.push({
                name,
                path: `${ctx.root}/${commonPath}/${entry}`,
                version,
                dependencies: deps,
                devDependencies: devDeps,
              });
            }
          }

          if (packages.length > 0) {
            evidence.addStructure(
              "workspace-detector",
              `Discovered ${packages.length} package(s) in "${commonPath}/" directory`,
            );
            break;
          }
        }
      }
    }

    // 7. Build dependency graph and classify packages
    const dependencyGraph = buildDependencyGraph(packages);
    const { apps, libs } = classifyPackages(packages);

    // 8. Determine root path
    const root = ctx.root;

    if (wsType === "none" && packages.length === 0) {
      confidence = 0;
      reasons.push("No workspace configuration detected");
    }

    const value: WorkspaceInfo = {
      type: wsType,
      root,
      packages,
      apps,
      libs,
      dependencyGraph,
    };

    return {
      detected: wsType !== "none",
      name: "workspace",
      value,
      version: null,
      confidence,
      evidence: evidence.getAll(),
      reasoning: reasons.join("; ") || "No workspace detected",
      duration: Date.now() - start,
    };
  },
};

import type {
  DetectionContext,
  DetectionResult,
  DependencyInfo,
  DependenciesInfo,
  DetectorPlugin,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";

interface PackageJsonDeps {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

function collectDeps(
  source: Record<string, string> | undefined,
  type: DependencyInfo["type"],
): DependencyInfo[] {
  if (!source) return [];
  return Object.entries(source).map(([name, version]) => ({
    name,
    version,
    type,
  }));
}

function findDuplicates(packages: DependencyInfo[]): string[] {
  const seen = new Map<string, Set<string>>();
  for (const pkg of packages) {
    const existing = seen.get(pkg.name);
    if (existing) {
      existing.add(pkg.version);
    } else {
      seen.set(pkg.name, new Set([pkg.version]));
    }
  }
  return Array.from(seen.entries())
    .filter(([, versions]) => versions.size > 1)
    .map(([name]) => name);
}

export const detector: DetectorPlugin = {
  meta: {
    name: "dependency",
    version: "1.0.0",
    description: "Analyzes project dependencies from package.json",
    author: "whichenv",
    stage: "dependencies",
    priority: 30,
    dependencies: [],
    tags: ["dependencies", "package.json", "npm"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<DependenciesInfo>> {
    const start = performance.now();
    const evidence = new EvidenceCollector();

    const pkg = ctx.packageJson as PackageJsonDeps | null;
    if (!pkg) {
      return {
        detected: false,
        name: "dependency",
        value: null,
        version: null,
        confidence: 0,
        evidence: [],
        reasoning: "No package.json found in the project root",
        duration: performance.now() - start,
      };
    }

    const prodDeps = collectDeps(pkg.dependencies, "production");
    const devDeps = collectDeps(pkg.devDependencies, "development");
    const peerDeps = collectDeps(pkg.peerDependencies, "peer");
    const optDeps = collectDeps(pkg.optionalDependencies, "optional");

    const packages = [...prodDeps, ...devDeps, ...peerDeps, ...optDeps];
    const duplicates = findDuplicates(packages);

    const value: DependenciesInfo = {
      total: packages.length,
      production: prodDeps.length,
      dev: devDeps.length,
      peer: peerDeps.length,
      optional: optDeps.length,
      packages,
      outdated: [],
      duplicates,
    };

    if (packages.length > 0) {
      evidence.addDependency(
        "dependency-detector",
        `Found ${prodDeps.length} production dependency(ies)`,
      );
    }
    if (devDeps.length > 0) {
      evidence.addDependency(
        "dependency-detector",
        `Found ${devDeps.length} dev dependency(ies)`,
      );
    }
    if (peerDeps.length > 0) {
      evidence.addDependency(
        "dependency-detector",
        `Found ${peerDeps.length} peer dependency(ies)`,
      );
    }
    if (optDeps.length > 0) {
      evidence.addDependency(
        "dependency-detector",
        `Found ${optDeps.length} optional dependency(ies)`,
      );
    }
    if (duplicates.length > 0) {
      evidence.addDependency(
        "dependency-detector",
        `Found ${duplicates.length} duplicate dependency(ies): ${duplicates.join(", ")}`,
      );
    }

    const duration = performance.now() - start;
    const confidence = packages.length > 0 ? 90 : 0;

    return {
      detected: packages.length > 0,
      name: "dependency",
      value,
      version: null,
      confidence,
      evidence: evidence.getAll(),
      reasoning: `Found ${packages.length} total dependency(ies) (${prodDeps.length} production, ${devDeps.length} dev, ${peerDeps.length} peer, ${optDeps.length} optional)`,
      duration,
    };
  },
};

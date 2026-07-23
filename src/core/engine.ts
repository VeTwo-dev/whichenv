import * as fs from "node:fs/promises";
import * as path from "node:path";
import type {
  DetectionResult,
  DetectionContext,
  DetectOptions,
  ProjectAnalysis,
  ProjectInfo,
  SerializedProjectAnalysis,
  ExportFormat,
  DiagnosticsResult,
  MetricsResult,
  Recommendation,
} from "../types/index.js";
import { PluginRegistry } from "./plugin-system.js";
import { DetectionPipeline } from "./pipeline.js";
import { MemoryCache } from "../cache/memory-cache.js";
import { createFileSystem } from "../utils/fs.js";
import { WhichenvLogger } from "../logger.js";
import { globalEmitter } from "../events.js";
import { calculateConfidence, mergeConfidence } from "./confidence.js";
import { registerAllDetectors } from "../detectors/index.js";
import { analyzeHealthScore } from "../analysis/health-score.js";
import { generateRecommendations } from "../analysis/recommendations.js";
import { analyzeProjectIntelligence } from "../analysis/project-intelligence.js";
import { runDiagnostics } from "../analysis/diagnostics.js";
import { detectCapabilities } from "../analysis/capabilities.js";

/**
 * Main engine that orchestrates the full detection pipeline.
 */
export class WhichenvEngine {
  private registry: PluginRegistry;
  private pipeline: DetectionPipeline;
  private logger: WhichenvLogger;
  private cache: MemoryCache;

  constructor(options?: { verbose?: boolean; quiet?: boolean }) {
    this.registry = new PluginRegistry();
    this.pipeline = new DetectionPipeline();
    this.logger = new WhichenvLogger({
      level: options?.verbose ? "debug" : options?.quiet ? "error" : "info",
      prefix: "whichenv",
    });
    this.cache = new MemoryCache();
    registerAllDetectors(this.registry);
  }

  async detect(options?: DetectOptions): Promise<ProjectAnalysis> {
    const startTime = Date.now();
    const root = options?.root ?? process.cwd();

    this.logger.info(`Scanning project at ${root}`);

    // Discover project
    const packageJson = await this.discoverPackageJson(root);
    const lockfiles = await this.discoverLockfiles(root);
    const configFiles = await this.discoverConfigFiles(root);
    const sourceFiles = await this.discoverSourceFiles(root);
    const dependencies = this.extractDependencies(packageJson, false);
    const devDependencies = this.extractDependencies(packageJson, true);

    const fsAdapter = createFileSystem(root);
    const detectionCache = new MemoryCache();

    const context: DetectionContext = {
      root,
      packageJson,
      lockfiles,
      configFiles,
      sourceFiles,
      dependencies,
      devDependencies,
      previousResults: new Map(),
      cache: {
        get: <T>(key: string) => detectionCache.get<T>(key),
        set: <T>(key: string, value: T, ttl?: number) => detectionCache.set(key, value, ttl),
        has: (key: string) => detectionCache.has(key),
        clear: () => detectionCache.clear(),
      },
      fs: fsAdapter,
      logger: this.logger,
      signal: AbortSignal.timeout(options?.timeout ?? 60_000),
    };

    // Run pipeline
    const pipelineResult = await this.pipeline.execute(this.registry, context);

    // Build project info
    const projectInfo = this.buildProjectInfo(root, packageJson);

    // Merge results
    const analysis = this.buildAnalysis(root, projectInfo, pipelineResult.results, Date.now() - startTime);

    this.logger.info(`Analysis complete in ${analysis.duration}ms`);

    return analysis;
  }

  private async discoverPackageJson(root: string): Promise<Record<string, unknown> | null> {
    try {
      const content = await fs.readFile(path.join(root, "package.json"), "utf-8");
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private async discoverLockfiles(root: string): Promise<string[]> {
    const lockfileNames = [
      "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb",
      "deno.lock", "npm-shrinkwrap.json",
    ];
    const found: string[] = [];
    for (const name of lockfileNames) {
      try {
        await fs.access(path.join(root, name));
        found.push(name);
      } catch {
        // not found
      }
    }
    return found;
  }

  private async discoverConfigFiles(root: string): Promise<Map<string, Record<string, unknown>>> {
    const configs = new Map<string, Record<string, unknown>>();
    const configPatterns = [
      "tsconfig.json", "tsconfig.*.json",
      "vite.config.*", "webpack.config.*", "rollup.config.*", "rspack.config.*",
      "eslint.config.*", ".eslintrc.*", "prettier.config.*", ".prettierrc.*",
      "biome.json", "biome.jsonc",
      "tailwind.config.*", "postcss.config.*",
      "jest.config.*", "vitest.config.*", "playwright.config.*",
      "turbo.json", "nx.json", "lerna.json", "rush.json",
      ".babelrc", "babel.config.*",
      "docker-compose.*", "Dockerfile",
      "pnpm-workspace.yaml",
    ];

    for (const pattern of configPatterns) {
      const isGlob = pattern.includes("*");
      if (isGlob) {
        try {
          const { glob } = await import("glob" as string).catch(() => ({
            glob: async (): Promise<string[]> => [],
          }));
          const files = await glob(pattern, { cwd: root, absolute: true, dot: true });
          for (const file of files) {
            const content = await this.readConfigFile(file);
            if (content) configs.set(path.relative(root, file), content);
          }
        } catch {
          // glob not available
        }
      } else {
        const filePath = path.join(root, pattern);
        const content = await this.readConfigFile(filePath);
        if (content) configs.set(pattern, content);
      }
    }

    return configs;
  }

  private async readConfigFile(filePath: string): Promise<Record<string, unknown> | null> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".json" || ext === ".jsonc") {
        try {
          return JSON.parse(content) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
      // For .ts/.js/.mjs config files, we just note their existence
      return { _filename: path.basename(filePath), _exists: true } as unknown as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private async discoverSourceFiles(root: string): Promise<string[]> {
    const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte"];
    const files: string[] = [];

    const scan = async (dir: string, depth = 0): Promise<void> => {
      if (depth > 5) return;
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist" || entry.name === "build") continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await scan(fullPath, depth + 1);
          } else if (extensions.some(ext => entry.name.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      } catch {
        // permission error
      }
    };

    await scan(root);
    return files;
  }

  private extractDependencies(packageJson: Record<string, unknown> | null, dev: boolean): Map<string, string> {
    const deps = new Map<string, string>();
    if (!packageJson) return deps;

    const field = dev ? "devDependencies" : "dependencies";
    const depObj = packageJson[field] as Record<string, string> | undefined;
    if (depObj) {
      for (const [name, version] of Object.entries(depObj)) {
        deps.set(name, version);
      }
    }
    return deps;
  }

  private buildProjectInfo(root: string, packageJson: Record<string, unknown> | null): ProjectInfo {
    return {
      name: (packageJson?.name as string) ?? path.basename(root),
      version: (packageJson?.version as string) ?? null,
      description: (packageJson?.description as string) ?? null,
      root,
      type: "unknown",
      license: (packageJson?.license as string) ?? null,
      author: typeof packageJson?.author === "string"
        ? packageJson.author
        : typeof packageJson?.author === "object" && packageJson.author !== null
          ? (packageJson.author as Record<string, unknown>).name as string
          : null,
    };
  }

  private buildAnalysis(
    root: string,
    project: ProjectInfo,
    results: Map<string, DetectionResult>,
    duration: number,
  ): ProjectAnalysis {
    const get = (name: string): DetectionResult => results.get(name) ?? this.emptyResult(name);

    // Extract individual items from detector results that return arrays
    const extractArray = <T>(detectorName: string): DetectionResult[] => {
      const result = results.get(detectorName);
      if (!result?.detected || !Array.isArray(result.value)) return [];
      return (result.value as T[]).map((item, i) => ({
        detected: true,
        name: (item as { name: string }).name ?? `${detectorName}-${i}`,
        value: item,
        version: (item as { version: string | null }).version ?? null,
        confidence: result.confidence,
        evidence: result.evidence,
        reasoning: result.reasoning,
        duration: result.duration,
      }));
    };

    const runtime = get("runtime");
    const workspace = get("workspace");
    const packageManager = get("package-manager");
    const frameworks = extractArray("framework");
    const buildTools = extractArray("build-tool");
    const language = get("language");
    const styling = extractArray("css");
    const databases = extractArray("database");
    const api = get("api");
    const testing = get("testing");
    const linting = get("linting");
    const formatting = get("formatting");
    const stateManagement = extractArray("state-management");
    const uiLibraries = extractArray("ui-library");
    const auth = extractArray("auth");
    const deployment = get("deployment");
    const git = get("git");
    const environment = get("environment");
    const configFiles = get("config-file");
    const dependencies = get("dependency");

    // Calculate overall confidence
    const allResults = [runtime, workspace, packageManager, language, ...frameworks, ...buildTools, ...styling, ...databases, api, testing, linting, formatting, ...stateManagement, ...uiLibraries, ...auth, deployment, git, environment];
    const confidences = allResults.filter(r => r.detected).map(r => r.confidence);
    const confidence = mergeConfidence(confidences);

    // Run analysis
    const diagnostics = runDiagnostics(results);
    const metrics = analyzeHealthScore(results, diagnostics);
    const recommendations = generateRecommendations(results, diagnostics, metrics);
    const capabilities = detectCapabilities(results);
    const intelligence = analyzeProjectIntelligence(results, project);
    project.type = intelligence.projectType;

    return {
      project,
      runtime,
      workspace,
      packageManager,
      frameworks,
      buildTools,
      language,
      styling,
      databases,
      api,
      testing,
      linting,
      formatting,
      stateManagement,
      uiLibraries,
      auth,
      deployment,
      git,
      environment,
      configFiles,
      dependencies,
      diagnostics,
      metrics,
      capabilities,
      recommendations,
      confidence,
      duration,
      timestamp: Date.now(),

      // Convenience methods
      isNext: () => this.hasFramework(frameworks, "next"),
      isReact: () => this.hasFramework(frameworks, "react"),
      isVue: () => this.hasFramework(frameworks, "vue"),
      isAngular: () => this.hasFramework(frameworks, "angular"),
      isSvelte: () => this.hasFramework(frameworks, "svelte"),
      isNode: () => runtime.detected && (runtime.value as { name: string } | null)?.name === "node",
      isBun: () => runtime.detected && (runtime.value as { name: string } | null)?.name === "bun",
      isDeno: () => runtime.detected && (runtime.value as { name: string } | null)?.name === "deno",
      isElectron: () => runtime.detected && (runtime.value as { name: string } | null)?.name === "electron",
      isTurbo: () => workspace.detected && (workspace.value as { type: string } | null)?.type === "turborepo",
      isNx: () => workspace.detected && (workspace.value as { type: string } | null)?.type === "nx",
      isLerna: () => workspace.detected && (workspace.value as { type: string } | null)?.type === "lerna",
      hasTailwind: () => styling.some(s => s.name === "tailwindcss"),
      hasPrisma: () => databases.some(d => d.name === "prisma"),
      hasDrizzle: () => databases.some(d => d.name === "drizzle"),
      hasDocker: () => deployment.detected && Array.isArray((deployment.value as { targets: string[] } | null)?.targets) && (deployment.value as { targets: string[] }).targets.includes("docker"),
      hasVitest: () => testing.detected && Array.isArray((testing.value as { frameworks: string[] } | null)?.frameworks) && (testing.value as { frameworks: string[] }).frameworks.includes("vitest"),
      hasJest: () => testing.detected && Array.isArray((testing.value as { frameworks: string[] } | null)?.frameworks) && (testing.value as { frameworks: string[] }).frameworks.includes("jest"),
      hasPlaywright: () => testing.detected && Array.isArray((testing.value as { frameworks: string[] } | null)?.frameworks) && (testing.value as { frameworks: string[] }).frameworks.includes("playwright"),
      hasGitHubActions: () => deployment.detected && Array.isArray((deployment.value as { targets: string[] } | null)?.targets) && (deployment.value as { targets: string[] }).targets.includes("github-actions"),
      hasWorkspace: () => workspace.detected && (workspace.value as { type: string } | null)?.type !== "none",
      supportsSSR: () => frameworks.some(f => ["next", "nuxt", "sveltekit", "remix", "astro", "hydrogen"].includes(f.name as string)),
      supportsEdgeRuntime: () => runtime.detected && ["cloudflare-workers", "vercel-edge", "netlify-edge", "fastly-compute"].includes((runtime.value as { name: string } | null)?.name ?? ""),
      summary: () => this.generateSummary(project, results),
      print: () => console.log(this.generateSummary(project, results)),
      toJSON: () => this.serialize(project, results, confidence, duration, metrics, diagnostics, recommendations, capabilities),
      toMarkdown: () => this.toMarkdown(project, results, metrics, recommendations),
      toHTML: () => this.toHTML(project, results, metrics, recommendations),
      toYAML: () => this.toYAML(project, results),
      toTree: () => this.toTree(project, results),
      toGraph: () => this.toGraph(results),
      toMermaid: () => this.toMermaid(results),
      export: (format: ExportFormat) => this.exportFormat(format, project, results, metrics, recommendations),
    } as ProjectAnalysis;
  }

  private hasFramework(frameworks: DetectionResult[], name: string): boolean {
    return frameworks.some(f => f.name === name && f.detected);
  }

  private emptyResult(name: string): DetectionResult {
    return {
      detected: false,
      name,
      value: null,
      version: null,
      confidence: 0,
      evidence: [],
      reasoning: "Not detected",
      duration: 0,
    };
  }

  private generateSummary(project: ProjectInfo, results: Map<string, DetectionResult>): string {
    const lines: string[] = [];
    lines.push(`Project: ${project.name ?? "unknown"} ${project.version ? `v${project.version}` : ""}`);
    lines.push(`Type: ${project.type}`);
    lines.push("");

    const detected = [...results.values()].filter(r => r.detected);
    if (detected.length === 0) {
      lines.push("No technologies detected.");
    } else {
      lines.push("Detected technologies:");
      for (const r of detected) {
        const version = r.version ? ` v${r.version}` : "";
        const confidence = ` (${r.confidence}%)`;
        lines.push(`  • ${r.name}${version}${confidence}`);
      }
    }

    return lines.join("\n");
  }

  private serialize(
    project: ProjectInfo,
    results: Map<string, DetectionResult>,
    confidence: number,
    duration: number,
    metrics: MetricsResult,
    diagnostics: DiagnosticsResult,
    recommendations: Recommendation[],
    capabilities: string[],
  ): SerializedProjectAnalysis {
    const get = (name: string): DetectionResult | null => results.get(name) ?? null;

    const extractArray = (detectorName: string): DetectionResult[] => {
      const result = results.get(detectorName);
      if (!result?.detected || !Array.isArray(result.value)) return [];
      return (result.value as Array<Record<string, unknown>>).map((item, i) => ({
        detected: true,
        name: String(item.name ?? `${detectorName}-${i}`),
        value: item,
        version: String(item.version ?? null),
        confidence: result.confidence,
        evidence: result.evidence,
        reasoning: result.reasoning,
        duration: result.duration,
      }));
    };

    return {
      project,
      runtime: get("runtime"),
      workspace: get("workspace"),
      packageManager: get("package-manager"),
      frameworks: extractArray("framework"),
      buildTools: extractArray("build-tool"),
      language: get("language"),
      styling: extractArray("css"),
      databases: extractArray("database"),
      api: get("api"),
      testing: get("testing"),
      linting: get("linting"),
      formatting: get("formatting"),
      stateManagement: extractArray("state-management"),
      uiLibraries: extractArray("ui-library"),
      auth: extractArray("auth"),
      deployment: get("deployment"),
      git: get("git"),
      environment: get("environment"),
      configFiles: get("config-file"),
      dependencies: get("dependency"),
      diagnostics,
      metrics,
      capabilities,
      recommendations,
      confidence,
      duration,
      timestamp: Date.now(),
    };
  }

  private toMarkdown(project: ProjectInfo, results: Map<string, DetectionResult>, metrics: MetricsResult, recommendations: Recommendation[]): string {
    const lines: string[] = [];
    lines.push(`# ${project.name ?? "Unknown Project"} — Environment Report`);
    lines.push("");
    lines.push(`**Generated by @vetwo/whichenv**`);
    lines.push("");

    const detected = [...results.values()].filter(r => r.detected);
    if (detected.length > 0) {
      lines.push("## Detected Technologies");
      lines.push("");
      lines.push("| Technology | Version | Confidence |");
      lines.push("|---|---|---|");
      for (const r of detected) {
        lines.push(`| ${r.name} | ${r.version ?? "—"} | ${r.confidence}% |`);
      }
      lines.push("");
    }

    lines.push("## Health Score");
    lines.push("");
    lines.push(`Overall: **${metrics.healthScore}/100**`);
    lines.push(`- Architecture: ${metrics.architectureScore}`);
    lines.push(`- Dependencies: ${metrics.dependencyHealth}`);
    lines.push(`- Testing: ${metrics.testingCoverage}`);
    lines.push(`- Security: ${metrics.securityScore}`);
    lines.push(`- Performance: ${metrics.performanceScore}`);
    lines.push("");

    if (recommendations.length > 0) {
      lines.push("## Recommendations");
      lines.push("");
      for (const rec of recommendations) {
        lines.push(`- **[${rec.severity.toUpperCase()}]** ${rec.title}: ${rec.description}`);
      }
    }

    return lines.join("\n");
  }

  private toHTML(project: ProjectInfo, results: Map<string, DetectionResult>, metrics: MetricsResult, recommendations: Recommendation[]): string {
    const detected = [...results.values()].filter(r => r.detected);
    const rows = detected.map(r =>
      `<tr><td>${r.name}</td><td>${r.version ?? "—"}</td><td>${r.confidence}%</td></tr>`
    ).join("\n");

    return `<!DOCTYPE html>
<html>
<head><title>${project.name ?? "Project"} — Environment Report</title>
<style>body{font-family:system-ui;max-width:800px;margin:0 auto;padding:2rem}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}
th{background:#f5f5f5}.score{font-size:2rem;font-weight:bold}</style></head>
<body>
<h1>${project.name ?? "Unknown Project"}</h1>
<p>Generated by @vetwo/whichenv</p>
<h2>Health Score: <span class="score">${metrics.healthScore}/100</span></h2>
<h2>Detected Technologies</h2>
<table><thead><tr><th>Technology</th><th>Version</th><th>Confidence</th></tr></thead>
<tbody>${rows}</tbody></table>
${recommendations.length > 0 ? `<h2>Recommendations</h2><ul>${recommendations.map(r =>
  `<li><strong>[${r.severity.toUpperCase()}]</strong> ${r.title}: ${r.description}</li>`
).join("")}</ul>` : ""}
</body></html>`;
  }

  private toYAML(project: ProjectInfo, results: Map<string, DetectionResult>): string {
    const lines: string[] = [];
    lines.push(`project:`);
    lines.push(`  name: "${project.name ?? "unknown"}"`);
    lines.push(`  version: "${project.version ?? "unknown"}"`);
    lines.push(`  type: "${project.type}"`);
    lines.push("");

    const detected = [...results.values()].filter(r => r.detected);
    if (detected.length > 0) {
      lines.push("detected:");
      for (const r of detected) {
        lines.push(`  - name: "${r.name}"`);
        lines.push(`    version: "${r.version ?? "unknown"}"`);
        lines.push(`    confidence: ${r.confidence}`);
      }
    }

    return lines.join("\n");
  }

  private toTree(project: ProjectInfo, results: Map<string, DetectionResult>): string {
    const lines: string[] = [];
    const name = project.name ?? "project";
    lines.push(name);

    const detected = [...results.values()].filter(r => r.detected);
    for (let i = 0; i < detected.length; i++) {
      const isLast = i === detected.length - 1;
      const prefix = isLast ? "└── " : "├── ";
      const r = detected[i]!;
      lines.push(`${prefix}${r.name}${r.version ? ` v${r.version}` : ""} (${r.confidence}%)`);
    }

    return lines.join("\n");
  }

  private toGraph(results: Map<string, DetectionResult>): string {
    const detected = [...results.values()].filter(r => r.detected);
    return detected.map(r => `${r.name} [label="${r.name}\\n${r.version ?? "?"}"]`).join("\n");
  }

  private toMermaid(results: Map<string, DetectionResult>): string {
    const lines: string[] = ["graph TD"];
    const detected = [...results.values()].filter(r => r.detected);

    for (let i = 0; i < detected.length; i++) {
      const r = detected[i]!;
      const id = `node${i}`;
      lines.push(`  ${id}["${r.name}${r.version ? ` v${r.version}` : ""}"]`);
    }

    if (detected.length > 1) {
      for (let i = 1; i < detected.length; i++) {
        lines.push(`  node0 --> node${i}`);
      }
    }

    return lines.join("\n");
  }

  private exportFormat(format: ExportFormat, project: ProjectInfo, results: Map<string, DetectionResult>, metrics: MetricsResult, recommendations: Recommendation[]): string {
    switch (format) {
      case "json": return JSON.stringify(this.serialize(project, results, 0, 0, metrics, { errors: [], warnings: [], suggestions: [], info: [], passed: 0, total: 0 }, recommendations, []), null, 2);
      case "markdown": return this.toMarkdown(project, results, metrics, recommendations);
      case "html": return this.toHTML(project, results, metrics, recommendations);
      case "yaml": return this.toYAML(project, results);
      case "tree": return this.toTree(project, results);
      case "graph": return this.toGraph(results);
      case "mermaid": return this.toMermaid(results);
      case "csv": {
        const detected = [...results.values()].filter(r => r.detected);
        const header = "name,version,confidence";
        const rows = detected.map(r => `${r.name},${r.version ?? ""},${r.confidence}`);
        return [header, ...rows].join("\n");
      }
      default: return "";
    }
  }
}

/**
 * Main entry point: detect the current project.
 */
export async function detectProject(options?: DetectOptions): Promise<ProjectAnalysis> {
  const engine = new WhichenvEngine(options);
  return engine.detect(options);
}

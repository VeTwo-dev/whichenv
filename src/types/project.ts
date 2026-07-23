import type { ConfidenceScore, DetectionResult, Evidence } from "./detection.js";

/**
 * The complete project analysis result.
 * Returned by detectProject() and contains every detected aspect.
 */
export interface ProjectAnalysis {
  project: ProjectInfo;
  runtime: DetectionResult;
  workspace: DetectionResult;
  packageManager: DetectionResult;
  frameworks: DetectionResult[];
  buildTools: DetectionResult[];
  language: DetectionResult;
  styling: DetectionResult[];
  databases: DetectionResult[];
  api: DetectionResult;
  testing: DetectionResult;
  linting: DetectionResult;
  formatting: DetectionResult;
  stateManagement: DetectionResult[];
  uiLibraries: DetectionResult[];
  auth: DetectionResult[];
  deployment: DetectionResult;
  git: DetectionResult;
  environment: DetectionResult;
  configFiles: DetectionResult;
  dependencies: DetectionResult;
  diagnostics: DiagnosticsResult;
  metrics: MetricsResult;
  capabilities: string[];
  recommendations: Recommendation[];
  confidence: ConfidenceScore;
  duration: number;
  timestamp: number;

  // Convenience methods
  isNext(): boolean;
  isReact(): boolean;
  isVue(): boolean;
  isAngular(): boolean;
  isSvelte(): boolean;
  isNode(): boolean;
  isBun(): boolean;
  isDeno(): boolean;
  isElectron(): boolean;
  isTurbo(): boolean;
  isNx(): boolean;
  isLerna(): boolean;
  hasTailwind(): boolean;
  hasPrisma(): boolean;
  hasDrizzle(): boolean;
  hasDocker(): boolean;
  hasVitest(): boolean;
  hasJest(): boolean;
  hasPlaywright(): boolean;
  hasGitHubActions(): boolean;
  hasWorkspace(): boolean;
  supportsSSR(): boolean;
  supportsEdgeRuntime(): boolean;
  summary(): string;
  print(): void;
  toJSON(): SerializedProjectAnalysis;
  toMarkdown(): string;
  toHTML(): string;
  toYAML(): string;
  toTree(): string;
  toGraph(): string;
  toMermaid(): string;
  export(format: ExportFormat): string;
}

/**
 * Basic project information.
 */
export interface ProjectInfo {
  name: string | null;
  version: string | null;
  description: string | null;
  root: string;
  type: ProjectType;
  license: string | null;
  author: string | null;
}

export type ProjectType =
  | "application"
  | "library"
  | "cli"
  | "monorepo"
  | "package"
  | "saas"
  | "api"
  | "documentation"
  | "design-system"
  | "component-library"
  | "unknown";

/**
 * Diagnostics result with errors, warnings, and suggestions.
 */
export interface DiagnosticsResult {
  errors: DiagnosticItem[];
  warnings: DiagnosticItem[];
  suggestions: DiagnosticItem[];
  info: DiagnosticItem[];
  passed: number;
  total: number;
}

export interface DiagnosticItem {
  code: string;
  message: string;
  severity: "error" | "warning" | "suggestion" | "info";
  category: string;
  fix?: string;
  impact?: string;
  evidence?: Evidence[];
}

/**
 * Project metrics.
 */
export interface MetricsResult {
  healthScore: number;
  complexityScore: number;
  maintainabilityScore: number;
  maturityScore: number;
  productionReadiness: number;
  architectureScore: number;
  dependencyHealth: number;
  testingCoverage: number;
  documentationScore: number;
  securityScore: number;
  performanceScore: number;
}

/**
 * A recommendation for improving the project.
 */
export interface Recommendation {
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  description: string;
  impact: string;
  fix: string | null;
  evidence: Evidence[];
}

/**
 * Serialized form of ProjectAnalysis (no methods, no Maps).
 */
export interface SerializedProjectAnalysis {
  project: ProjectInfo;
  runtime: DetectionResult | null;
  workspace: DetectionResult | null;
  packageManager: DetectionResult | null;
  frameworks: DetectionResult[];
  buildTools: DetectionResult[];
  language: DetectionResult | null;
  styling: DetectionResult[];
  databases: DetectionResult[];
  api: DetectionResult | null;
  testing: DetectionResult | null;
  linting: DetectionResult | null;
  formatting: DetectionResult | null;
  stateManagement: DetectionResult[];
  uiLibraries: DetectionResult[];
  auth: DetectionResult[];
  deployment: DetectionResult | null;
  git: DetectionResult | null;
  environment: DetectionResult | null;
  configFiles: DetectionResult | null;
  dependencies: DetectionResult | null;
  diagnostics: DiagnosticsResult;
  metrics: MetricsResult;
  capabilities: string[];
  recommendations: Recommendation[];
  confidence: number;
  duration: number;
  timestamp: number;
}

export type ExportFormat = "json" | "markdown" | "html" | "yaml" | "csv" | "mermaid" | "graphviz" | "tree" | "graph";

/**
 * Options for detectProject().
 */
export interface DetectOptions {
  root?: string;
  parallel?: boolean;
  cache?: boolean;
  cacheDir?: string;
  plugins?: string[];
  skip?: string[];
  timeout?: number;
  verbose?: boolean;
  quiet?: boolean;
}

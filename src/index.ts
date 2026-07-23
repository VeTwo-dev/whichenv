/**
 * @vetwo/whichenv
 * JavaScript & TypeScript Project Intelligence Engine
 *
 * @example
 * ```ts
 * import { detectProject } from "@vetwo/whichenv";
 *
 * const project = await detectProject();
 * console.log(project.summary());
 * ```
 */

// Core engine
export { WhichenvEngine, detectProject } from "./core/engine.js";
export { PluginRegistry } from "./core/plugin-system.js";
export { DetectionPipeline } from "./core/pipeline.js";
export { calculateConfidence, mergeConfidence, confidenceLabel } from "./core/confidence.js";
export { EvidenceCollector } from "./core/evidence.js";

// Analysis
export { analyzeHealthScore } from "./analysis/health-score.js";
export { generateRecommendations } from "./analysis/recommendations.js";
export { analyzeProjectIntelligence } from "./analysis/project-intelligence.js";
export { runDiagnostics } from "./analysis/diagnostics.js";
export { detectCapabilities } from "./analysis/capabilities.js";

// Export
export { toJSON } from "./export/json.js";
export { toMarkdown } from "./export/markdown.js";
export { toYAML } from "./export/yaml.js";
export { toHTML } from "./export/html.js";
export { toMermaid } from "./export/mermaid.js";
export { toGraphviz } from "./export/graphviz.js";
export { toCSV } from "./export/csv.js";

// Cache
export { MemoryCache } from "./cache/memory-cache.js";
export { FSCache, createCache } from "./cache/index.js";

// Logger
export { WhichenvLogger, createLogger, logger } from "./logger.js";

// Events
export { EventEmitter, globalEmitter } from "./events.js";

// Types
export type {
  // Detection
  ConfidenceScore,
  Severity,
  Evidence,
  DetectionResult,
  DetectionGroup,

  // Detectors
  RuntimeName,
  RuntimeInfo,
  RuntimeResult,
  PackageManagerName,
  PackageManagerInfo,
  PackageManagerResult,
  WorkspaceType,
  WorkspacePackage,
  WorkspaceInfo,
  WorkspaceResult,
  FrameworkType,
  FrameworkName,
  FrameworkInfo,
  FrameworkResult,
  BuildToolName,
  BuildToolInfo,
  BuildToolResult,
  LanguageName,
  ModuleSystem,
  TypeScriptConfig,
  LanguageInfo,
  LanguageResult,
  CSSFrameworkName,
  CSSFrameworkInfo,
  CSSFrameworkResult,
  ORMName,
  DatabaseName,
  DatabaseInfo,
  DatabaseResult,
  APIType,
  APIInfo,
  APIResult,
  TestFrameworkName,
  TestingInfo,
  TestingResult,
  LintingName,
  LintingInfo,
  LintingResult,
  FormattingName,
  FormattingInfo,
  FormattingResult,
  StateManagementName,
  StateManagementInfo,
  StateManagementResult,
  UILibraryName,
  UILibraryInfo,
  UILibraryResult,
  AuthName,
  AuthInfo,
  AuthResult,
  DeploymentTarget,
  DeploymentInfo,
  DeploymentResult,
  GitInfo,
  GitResult,
  EnvironmentInfo,
  EnvironmentResult,
  ConfigFileInfo,
  ConfigFileResult,
  DependencyInfo,
  DependenciesInfo,
  DependenciesResult,

  // Project
  ProjectAnalysis,
  ProjectInfo,
  ProjectType,
  DiagnosticsResult,
  DiagnosticItem,
  MetricsResult,
  Recommendation,
  SerializedProjectAnalysis,
  ExportFormat,
  DetectOptions,

  // Plugin
  DetectionContext,
  FileSystemAdapter,
  Logger,
  DetectionCache,
  PluginMeta,
  DetectorPlugin,
  PluginContext,
  PipelineStage,
  PipelineConfig,
  PluginRegistryInterface,
  WhichenvEvents,
} from "./types/index.js";

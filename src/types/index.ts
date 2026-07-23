export type { ConfidenceScore, Severity, Evidence, DetectionResult, DetectionGroup } from "./detection.js";
export type {
  RuntimeName, RuntimeInfo, RuntimeResult,
  PackageManagerName, PackageManagerInfo, PackageManagerResult,
  WorkspaceType, WorkspacePackage, WorkspaceInfo, WorkspaceResult,
  FrameworkType, FrameworkName, FrameworkInfo, FrameworkResult,
  BuildToolName, BuildToolInfo, BuildToolResult,
  LanguageName, ModuleSystem, TypeScriptConfig, LanguageInfo, LanguageResult,
  CSSFrameworkName, CSSFrameworkInfo, CSSFrameworkResult,
  ORMName, DatabaseName, DatabaseInfo, DatabaseResult,
  APIType, APIInfo, APIResult,
  TestFrameworkName, TestingInfo, TestingResult,
  LintingName, LintingInfo, LintingResult,
  FormattingName, FormattingInfo, FormattingResult,
  StateManagementName, StateManagementInfo, StateManagementResult,
  UILibraryName, UILibraryInfo, UILibraryResult,
  AuthName, AuthInfo, AuthResult,
  DeploymentTarget, DeploymentInfo, DeploymentResult,
  GitInfo, GitResult,
  EnvironmentInfo, EnvironmentResult,
  ConfigFileInfo, ConfigFileResult,
  DependencyInfo, DependenciesInfo, DependenciesResult,
} from "./detectors.js";
export type {
  ProjectAnalysis, ProjectInfo, ProjectType,
  DiagnosticsResult, DiagnosticItem,
  MetricsResult, Recommendation,
  SerializedProjectAnalysis, ExportFormat, DetectOptions,
} from "./project.js";
export type {
  DetectionContext, FileSystemAdapter, Logger, DetectionCache,
  PluginMeta, DetectorPlugin, PluginContext,
  PipelineStage, PipelineConfig, PluginRegistryInterface,
  WhichenvEvents,
} from "./plugin.js";

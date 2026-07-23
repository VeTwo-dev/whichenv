import type { DetectionResult } from "./detection.js";

/**
 * The context passed to every detector plugin.
 */
export interface DetectionContext {
  root: string;
  packageJson: Record<string, unknown> | null;
  lockfiles: string[];
  configFiles: Map<string, Record<string, unknown>>;
  sourceFiles: string[];
  dependencies: Map<string, string>;
  devDependencies: Map<string, string>;
  previousResults: Map<string, DetectionResult>;
  cache: DetectionCache;
  fs: FileSystemAdapter;
  logger: Logger;
  signal: AbortSignal;
}

/**
 * File system adapter for detectors to use.
 */
export interface FileSystemAdapter {
  readFile(path: string): Promise<string | null>;
  readJSON(path: string): Promise<Record<string, unknown> | null>;
  exists(path: string): Promise<boolean>;
  readDir(path: string): Promise<string[]>;
  glob(pattern: string, cwd: string): Promise<string[]>;
}

/**
 * Logger interface for detectors.
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Cache for detection results.
 */
export interface DetectionCache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  has(key: string): boolean;
  clear(): void;
}

/**
 * Plugin metadata.
 */
export interface PluginMeta {
  name: string;
  version: string;
  description: string;
  author: string;
  stage: string;
  priority: number;
  dependencies: string[];
  tags: string[];
}

/**
 * A detector plugin.
 */
export interface DetectorPlugin {
  meta: PluginMeta;
  detect(ctx: DetectionContext): Promise<DetectionResult>;
  init?(ctx: PluginContext): Promise<void>;
  destroy?(): Promise<void>;
}

/**
 * Plugin context for lifecycle hooks.
 */
export interface PluginContext {
  root: string;
  fs: FileSystemAdapter;
  logger: Logger;
  cache: DetectionCache;
  registerHook(hook: string, callback: (...args: unknown[]) => Promise<unknown>): void;
}

/**
 * Pipeline stage.
 */
export interface PipelineStage {
  name: string;
  description: string;
  detectors: string[];
  parallel: boolean;
  required: boolean;
}

/**
 * Pipeline configuration.
 */
export interface PipelineConfig {
  stages: PipelineStage[];
  parallel: boolean;
  timeout: number;
  retries: number;
  concurrency: number;
}

/**
 * Plugin registry interface.
 */
export interface PluginRegistryInterface {
  register(plugin: DetectorPlugin): void;
  get(name: string): DetectorPlugin | undefined;
  getByStage(stage: string): DetectorPlugin[];
  getAll(): DetectorPlugin[];
  enable(name: string): void;
  disable(name: string): void;
  isEnabled(name: string): boolean;
  has(name: string): boolean;
  remove(name: string): void;
}

/**
 * Event map for the event emitter.
 */
export interface WhichenvEvents {
  [key: string]: unknown;
  "detection:start": { root: string };
  "detection:progress": { stage: string; detector: string; progress: number };
  "detection:result": { detector: string; result: DetectionResult };
  "detection:error": { detector: string; error: Error };
  "detection:complete": { duration: number; results: Map<string, DetectionResult> };
  "pipeline:stage:start": { stage: string };
  "pipeline:stage:complete": { stage: string; duration: number };
  "cache:hit": { key: string };
  "cache:miss": { key: string };
}

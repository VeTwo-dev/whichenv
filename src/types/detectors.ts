import type { ConfidenceScore, DetectionResult, Evidence } from "./detection.js";

// ─── Runtime ───────────────────────────────────────────────────────────────────

export type RuntimeName =
  | "node"
  | "bun"
  | "deno"
  | "electron"
  | "react-native"
  | "expo"
  | "browser"
  | "cloudflare-workers"
  | "vercel-edge"
  | "netlify-edge"
  | "fastly-compute"
  | "tauri"
  | "capacitor"
  | "nw.js"
  | "unknown";

export interface RuntimeInfo {
  name: RuntimeName;
  version: string | null;
  capabilities: string[];
  compatibility: string[];
  executionEnvironment: string | null;
}

export type RuntimeResult = DetectionResult<RuntimeInfo>;

// ─── Package Manager ───────────────────────────────────────────────────────────

export type PackageManagerName = "npm" | "pnpm" | "yarn" | "yarn-classic" | "yarn-berry" | "bun" | "deno" | "unknown";

export interface PackageManagerInfo {
  name: PackageManagerName;
  version: string | null;
  lockfile: string | null;
  cacheDir: string | null;
  workspaceSupport: boolean;
  installStrategy: string | null;
}

export type PackageManagerResult = DetectionResult<PackageManagerInfo>;

// ─── Workspace ─────────────────────────────────────────────────────────────────

export type WorkspaceType =
  | "turborepo"
  | "nx"
  | "lerna"
  | "rush"
  | "moonrepo"
  | "lage"
  | "pnpm-workspace"
  | "yarn-workspace"
  | "npm-workspace"
  | "custom"
  | "none";

export interface WorkspacePackage {
  name: string;
  path: string;
  version: string | null;
  dependencies: string[];
  devDependencies: string[];
}

export interface WorkspaceInfo {
  type: WorkspaceType;
  root: string;
  packages: WorkspacePackage[];
  apps: WorkspacePackage[];
  libs: WorkspacePackage[];
  dependencyGraph: Map<string, string[]>;
}

export type WorkspaceResult = DetectionResult<WorkspaceInfo>;

// ─── Framework ─────────────────────────────────────────────────────────────────

export type FrameworkType = "frontend" | "backend" | "fullstack" | "meta-framework" | "mobile" | "desktop" | "unknown";

export type FrameworkName =
  // Frontend
  | "react" | "vue" | "angular" | "svelte" | "solid" | "preact" | "qwik"
  // Meta / Fullstack
  | "next" | "nuxt" | "sveltekit" | "astro" | "remix" | "gatsby" | "fresh" | "redwood" | "blitz" | "hydrogen" | "wasp" | "meteor"
  // Backend
  | "express" | "fastify" | "nestjs" | "hono" | "koa" | "adonisjs" | "elysia" | "nitro" | "hyperexpress" | "feathers"
  // Mobile/Desktop
  | "react-native" | "expo" | "ionic" | "electron" | "tauri" | "capacitor" | "nw.js"
  | "unknown";

export interface FrameworkInfo {
  name: FrameworkName;
  type: FrameworkType;
  version: string | null;
  features: string[];
  config: Record<string, unknown> | null;
  configPath: string | null;
}

export type FrameworkResult = DetectionResult<FrameworkInfo>;

// ─── Build Tool ────────────────────────────────────────────────────────────────

export type BuildToolName =
  | "vite" | "webpack" | "rspack" | "rolldown" | "rollup" | "parcel" | "esbuild"
  | "tsup" | "swc" | "babel" | "unbuild" | "turbopack" | "unknown";

export interface BuildToolInfo {
  name: BuildToolName;
  version: string | null;
  config: Record<string, unknown> | null;
  configPath: string | null;
  plugins: string[];
}

export type BuildToolResult = DetectionResult<BuildToolInfo>;

// ─── Language ──────────────────────────────────────────────────────────────────

export type LanguageName = "javascript" | "typescript" | "jsx" | "tsx" | "unknown";
export type ModuleSystem = "esm" | "commonjs" | "mixed" | "unknown";

export interface TypeScriptConfig {
  target: string | null;
  module: string | null;
  moduleResolution: string | null;
  strict: boolean;
  jsx: string | null;
  decorators: boolean;
  paths: Record<string, string[]> | null;
  aliases: Record<string, string> | null;
  esModuleInterop: boolean;
  verbatimModuleSyntax: boolean;
  isolatedModules: boolean;
}

export interface LanguageInfo {
  primary: LanguageName;
  moduleSystem: ModuleSystem;
  tsconfig: TypeScriptConfig | null;
  tsconfigPath: string | null;
  sourceExtensions: string[];
  fileCount: Record<string, number>;
}

export type LanguageResult = DetectionResult<LanguageInfo>;

// ─── CSS / Styling ─────────────────────────────────────────────────────────────

export type CSSFrameworkName =
  | "tailwindcss" | "unocss" | "windicss" | "pandacss" | "postcss" | "sass" | "less"
  | "stylus" | "emotion" | "styled-components" | "vanilla-extract" | "css-modules"
  | "unknown";

export interface CSSFrameworkInfo {
  name: CSSFrameworkName;
  version: string | null;
  config: Record<string, unknown> | null;
  configPath: string | null;
}

export type CSSFrameworkResult = DetectionResult<CSSFrameworkInfo>;

// ─── Database ──────────────────────────────────────────────────────────────────

export type ORMName = "prisma" | "drizzle" | "mikroorm" | "sequelize" | "typeorm" | "mongoose" | "knex" | "kysely" | "unknown";
export type DatabaseName = "postgresql" | "mysql" | "mariadb" | "sqlite" | "mongodb" | "redis" | "turso" | "neon" | "planetscale" | "supabase" | "unknown";

export interface DatabaseInfo {
  orm: ORMName | null;
  ormVersion: string | null;
  databases: DatabaseName[];
  connectionString: boolean;
  config: Record<string, unknown> | null;
}

export type DatabaseResult = DetectionResult<DatabaseInfo>;

// ─── API ───────────────────────────────────────────────────────────────────────

export type APIType = "rest" | "graphql" | "trpc" | "grpc" | "openapi" | "swagger" | "rpc" | "unknown";

export interface APIInfo {
  types: APIType[];
  schemas: string[];
  config: Record<string, unknown> | null;
}

export type APIResult = DetectionResult<APIInfo>;

// ─── Testing ───────────────────────────────────────────────────────────────────

export type TestFrameworkName =
  | "vitest" | "jest" | "playwright" | "cypress" | "ava" | "jasmine"
  | "mocha" | "webdriverio" | "unknown";

export interface TestingInfo {
  frameworks: TestFrameworkName[];
  config: Record<string, unknown> | null;
  configPaths: string[];
  coverageTool: string | null;
}

export type TestingResult = DetectionResult<TestingInfo>;

// ─── Linting ───────────────────────────────────────────────────────────────────

export type LintingName = "eslint" | "biome" | "oxlint" | "tslint" | "standardjs" | "unknown";

export interface LintingInfo {
  name: LintingName;
  version: string | null;
  config: Record<string, unknown> | null;
  configPath: string | null;
  plugins: string[];
}

export type LintingResult = DetectionResult<LintingInfo>;

// ─── Formatting ────────────────────────────────────────────────────────────────

export type FormattingName = "prettier" | "biome" | "dprint" | "unknown";

export interface FormattingInfo {
  name: FormattingName;
  version: string | null;
  config: Record<string, unknown> | null;
  configPath: string | null;
}

export type FormattingResult = DetectionResult<FormattingInfo>;

// ─── State Management ──────────────────────────────────────────────────────────

export type StateManagementName =
  | "redux" | "zustand" | "mobx" | "recoil" | "jotai"
  | "pinia" | "vuex" | "xstate" | "unknown";

export interface StateManagementInfo {
  name: StateManagementName;
  version: string | null;
}

export type StateManagementResult = DetectionResult<StateManagementInfo>;

// ─── UI Library ────────────────────────────────────────────────────────────────

export type UILibraryName =
  | "material-ui" | "chakra-ui" | "ant-design" | "mantine" | "daisyui"
  | "headless-ui" | "radix-ui" | "shadcn-ui" | "primereact"
  | "unknown";

export interface UILibraryInfo {
  name: UILibraryName;
  version: string | null;
}

export type UILibraryResult = DetectionResult<UILibraryInfo>;

// ─── Auth ──────────────────────────────────────────────────────────────────────

export type AuthName =
  | "auth.js" | "better-auth" | "clerk" | "firebase-auth"
  | "lucia" | "passport" | "supabase-auth" | "unknown";

export interface AuthInfo {
  name: AuthName;
  version: string | null;
}

export type AuthResult = DetectionResult<AuthInfo>;

// ─── Deployment ────────────────────────────────────────────────────────────────

export type DeploymentTarget =
  | "docker" | "docker-compose" | "kubernetes" | "helm"
  | "github-actions" | "gitlab-ci" | "circleci" | "azure-pipelines"
  | "vercel" | "railway" | "netlify" | "render" | "fly.io"
  | "unknown";

export interface DeploymentInfo {
  targets: DeploymentTarget[];
  configs: Record<string, string>;
}

export type DeploymentResult = DetectionResult<DeploymentInfo>;

// ─── Git ───────────────────────────────────────────────────────────────────────

export interface GitInfo {
  root: string | null;
  branch: string | null;
  remote: string | null;
  provider: string | null;
  dirty: boolean;
  tags: string[];
  recentCommits: Array<{ hash: string; message: string; date: string }>;
}

export type GitResult = DetectionResult<GitInfo>;

// ─── Environment ───────────────────────────────────────────────────────────────

export interface EnvironmentInfo {
  files: string[];
  variables: Record<string, string[]>;
}

export type EnvironmentResult = DetectionResult<EnvironmentInfo>;

// ─── Config Files ──────────────────────────────────────────────────────────────

export interface ConfigFileInfo {
  path: string;
  name: string;
  format: "json" | "jsonc" | "yaml" | "yml" | "js" | "ts" | "mjs" | "cjs" | "toml" | "ini" | "unknown";
  parsed: Record<string, unknown> | null;
  size: number;
}

export type ConfigFileResult = DetectionResult<ConfigFileInfo[]>;

// ─── Dependencies ──────────────────────────────────────────────────────────────

export interface DependencyInfo {
  name: string;
  version: string;
  type: "production" | "development" | "peer" | "optional";
}

export interface DependenciesInfo {
  total: number;
  production: number;
  dev: number;
  peer: number;
  optional: number;
  packages: DependencyInfo[];
  outdated: string[];
  duplicates: string[];
}

export type DependenciesResult = DetectionResult<DependenciesInfo>;

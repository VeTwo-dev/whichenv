import type {
  DetectionResult,
  DetectionContext,
  DatabaseInfo,
  ORMName,
  DatabaseName,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";
import { calculateConfidence } from "../core/confidence.js";

const ORM_DEPS: Record<string, ORMName> = {
  prisma: "prisma",
  "@prisma/client": "prisma",
  "drizzle-orm": "drizzle",
  mikroorm: "mikroorm",
  "@mikro-orm/core": "mikroorm",
  sequelize: "sequelize",
  typeorm: "typeorm",
  mongoose: "mongoose",
  knex: "knex",
  kysely: "kysely",
};

const DB_DEPS: Record<string, DatabaseName> = {
  pg: "postgresql",
  postgres: "postgresql",
  mysql2: "mysql",
  mysql: "mysql",
  "better-sqlite3": "sqlite",
  "sqlite3": "sqlite",
  mongodb: "mongodb",
  mongoose: "mongodb",
  redis: "redis",
  ioredis: "redis",
  "@libsql/client": "turso",
  "@neondatabase/serverless": "neon",
};

const ORM_CONFIG_FILES: Array<[string, ORMName]> = [
  ["prisma/schema.prisma", "prisma"],
  ["drizzle.config.ts", "drizzle"],
  ["drizzle.config.js", "drizzle"],
  ["drizzle.config.mjs", "drizzle"],
  ["mikro-orm.config.ts", "mikroorm"],
  ["mikro-orm.config.js", "mikroorm"],
];

const CONN_STR_ENV_KEYS = [
  "DATABASE_URL",
  "DB_URL",
  "MONGODB_URI",
  "MONGO_URI",
  "REDIS_URL",
  "NEON_DATABASE_URL",
  "LIBSQL_URL",
  "TURSO_DATABASE_URL",
];

function detectConnectionString(ctx: DetectionContext): boolean {
  const pkgJson = ctx.packageJson as Record<string, unknown> | null;
  const env = (pkgJson?.env ?? {}) as Record<string, string>;
  for (const key of CONN_STR_ENV_KEYS) {
    if (env[key]) return true;
  }
  for (const [configPath, config] of ctx.configFiles) {
    if (typeof config === "object" && config !== null) {
      const configStr = JSON.stringify(config);
      for (const key of CONN_STR_ENV_KEYS) {
        if (configStr.includes(key)) return true;
      }
      if (configStr.includes("connectionString") || configStr.includes("DATABASE_URL")) {
        return true;
      }
    }
  }
  return false;
}

export const detector = {
  meta: {
    name: "database",
    version: "1.0.0",
    description: "Detects ORMs, database drivers, and database configurations",
    author: "@vetwo",
    stage: "data",
    priority: 60,
    dependencies: [],
    tags: ["database", "orm", "sql", "nosql", "prisma", "drizzle"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<DatabaseInfo>> {
    const start = performance.now();
    const evidence = new EvidenceCollector();

    const allDeps = new Map<string, string>([
      ...ctx.dependencies,
      ...ctx.devDependencies,
    ]);

    let orm: ORMName | null = null;
    let ormVersion: string | null = null;
    const databases: DatabaseName[] = [];
    let config: Record<string, unknown> | null = null;

    for (const [pkg, ormName] of Object.entries(ORM_DEPS)) {
      const version = allDeps.get(pkg);
      if (version) {
        evidence.addDependency("package.json", `Found ORM dependency ${pkg} v${version}`, pkg);
        if (orm === null || pkg === `@${ormName}/client` || pkg === ormName) {
          orm = ormName;
          ormVersion = version;
        }
      }
    }

    for (const [pkg, dbName] of Object.entries(DB_DEPS)) {
      if (allDeps.has(pkg)) {
        evidence.addDependency("package.json", `Found database driver ${pkg}`, pkg);
        if (!databases.includes(dbName)) {
          databases.push(dbName);
        }
      }
    }

    for (const [configFile, ormName] of ORM_CONFIG_FILES) {
      if (ctx.configFiles.has(configFile)) {
        evidence.addConfig("config", `Found ORM config ${configFile}`, configFile);
        config = ctx.configFiles.get(configFile) ?? null;
        if (orm === null) {
          orm = ormName;
        }
      }
    }

    if (orm === null) {
      for (const [glob, ormName] of ORM_CONFIG_FILES) {
        for (const configPath of ctx.configFiles.keys()) {
          if (configPath.includes(glob.replace("*", ""))) {
            evidence.addConfig("config", `Detected ORM config ${configPath}`, configPath);
            orm = ormName;
            config = ctx.configFiles.get(configPath) ?? null;
            break;
          }
        }
        if (orm !== null) break;
      }
    }

    const hasConnectionString = detectConnectionString(ctx);
    if (hasConnectionString) {
      evidence.addEnv("env", "Connection string environment variable detected");
    }

    const detected = orm !== null || databases.length > 0;
    const confidence = calculateConfidence(evidence.getAll());
    const duration = performance.now() - start;

    const value: DatabaseInfo = {
      orm,
      ormVersion,
      databases,
      connectionString: hasConnectionString,
      config,
    };

    return {
      detected,
      name: "database",
      value: detected ? value : null,
      version: null,
      confidence,
      evidence: evidence.getAll(),
      reasoning: detected
        ? buildReasoning(orm, databases, hasConnectionString)
        : "No database dependencies, ORMs, or configurations detected",
      duration,
    };
  },
};

function buildReasoning(orm: ORMName | null, databases: DatabaseName[], connStr: boolean): string {
  const parts: string[] = [];
  if (orm) parts.push(`ORM: ${orm}`);
  if (databases.length > 0) parts.push(`Databases: ${databases.join(", ")}`);
  if (connStr) parts.push("connection string detected");
  return parts.join("; ") || "Database tooling detected";
}

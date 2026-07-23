import type {
  DetectionResult,
  DetectionContext,
  APIInfo,
  APIType,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";
import { calculateConfidence } from "../core/confidence.js";

const API_DEPS: Array<{ pkg: string; type: APIType; schema?: string }> = [
  { pkg: "express", type: "rest" },
  { pkg: "fastify", type: "rest" },
  { pkg: "hono", type: "rest" },
  { pkg: "koa", type: "rest" },
  { pkg: "@nestjs/core", type: "rest" },
  { pkg: "graphql", type: "graphql", schema: "graphql" },
  { pkg: "@apollo/server", type: "graphql", schema: "graphql" },
  { pkg: "graphql-yoga", type: "graphql", schema: "graphql" },
  { pkg: "@trpc/server", type: "trpc" },
  { pkg: "@grpc/grpc-js", type: "grpc" },
  { pkg: "swagger-ui-express", type: "openapi", schema: "openapi" },
  { pkg: "@asteasolutions/zod-to-openapi", type: "openapi", schema: "openapi" },
  { pkg: "swagger-jsdoc", type: "swagger", schema: "swagger" },
];

const CONFIG_PATTERNS: Array<[string, APIType]> = [
  ["graphql.*", "graphql"],
  ["schema.graphql", "graphql"],
  ["*.graphql", "graphql"],
  ["openapi.json", "openapi"],
  ["openapi.yaml", "openapi"],
  ["openapi.yml", "openapi"],
  ["swagger.json", "swagger"],
  ["swagger.yaml", "swagger"],
  ["swagger.yml", "swagger"],
  ["*.proto", "grpc"],
];

function findSchemaFiles(ctx: DetectionContext, types: APIType[]): string[] {
  const schemas: string[] = [];
  const typeSet = new Set(types);

  if (typeSet.has("graphql") || typeSet.has("openapi") || typeSet.has("swagger") || typeSet.has("grpc")) {
    for (const sourceFile of ctx.sourceFiles) {
      const basename = sourceFile.split("/").pop() ?? "";
      if (typeSet.has("graphql") && (basename.endsWith(".graphql") || basename.endsWith(".gql"))) {
        schemas.push(sourceFile);
      }
      if (typeSet.has("grpc") && basename.endsWith(".proto")) {
        schemas.push(sourceFile);
      }
      if (
        (typeSet.has("openapi") || typeSet.has("swagger")) &&
        (basename === "openapi.json" ||
          basename === "openapi.yaml" ||
          basename === "openapi.yml" ||
          basename === "swagger.json" ||
          basename === "swagger.yaml" ||
          basename === "swagger.yml")
      ) {
        schemas.push(sourceFile);
      }
    }
  }

  return schemas;
}

function findApiConfig(ctx: DetectionContext, types: APIType[]): Record<string, unknown> | null {
  const typeSet = new Set(types);

  if (typeSet.has("graphql")) {
    for (const [path, config] of ctx.configFiles) {
      if (path.includes("graphql") && typeof config === "object") {
        return config;
      }
    }
  }

  if (typeSet.has("openapi") || typeSet.has("swagger")) {
    for (const [path, config] of ctx.configFiles) {
      if (
        (path.includes("openapi") || path.includes("swagger")) &&
        typeof config === "object"
      ) {
        return config;
      }
    }
  }

  return null;
}

export const detector = {
  meta: {
    name: "api",
    version: "1.0.0",
    description: "Detects API styles: REST, GraphQL, tRPC, gRPC, OpenAPI/Swagger",
    author: "@vetwo",
    stage: "data",
    priority: 55,
    dependencies: [],
    tags: ["api", "rest", "graphql", "trpc", "grpc", "openapi"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<APIInfo>> {
    const start = performance.now();
    const evidence = new EvidenceCollector();

    const allDeps = new Map<string, string>([
      ...ctx.dependencies,
      ...ctx.devDependencies,
    ]);

    const detectedTypes = new Set<APIType>();
    const detectedSchemas = new Set<string>();

    for (const { pkg, type, schema } of API_DEPS) {
      const version = allDeps.get(pkg);
      if (version) {
        evidence.addDependency("package.json", `Found ${pkg} v${version}`, pkg);
        detectedTypes.add(type);
        if (schema) detectedSchemas.add(schema);
      }
    }

    for (const [pattern, type] of CONFIG_PATTERNS) {
      for (const configPath of ctx.configFiles.keys()) {
        if (matchesPattern(configPath, pattern)) {
          evidence.addConfig("config", `Found API config ${configPath}`, configPath);
          detectedTypes.add(type);
          if (type === "graphql") detectedSchemas.add("graphql");
          if (type === "openapi") detectedSchemas.add("openapi");
          if (type === "swagger") detectedSchemas.add("swagger");
        }
      }
    }

    for (const sourceFile of ctx.sourceFiles) {
      const basename = sourceFile.split("/").pop() ?? "";
      if (basename.endsWith(".graphql") || basename.endsWith(".gql")) {
        evidence.addFile("source", `Found GraphQL schema ${sourceFile}`, sourceFile);
        detectedTypes.add("graphql");
        detectedSchemas.add("graphql");
      }
      if (basename.endsWith(".proto")) {
        evidence.addFile("source", `Found protobuf file ${sourceFile}`, sourceFile);
        detectedTypes.add("grpc");
      }
    }

    const schemaFiles = findSchemaFiles(ctx, [...detectedTypes]);
    for (const sf of schemaFiles) {
      detectedSchemas.add(sf);
    }

    const types = [...detectedTypes];
    const schemas = [...detectedSchemas];
    const config = findApiConfig(ctx, types);

    const detected = types.length > 0;
    const confidence = calculateConfidence(evidence.getAll());
    const duration = performance.now() - start;

    const value: APIInfo = {
      types,
      schemas,
      config,
    };

    return {
      detected,
      name: "api",
      value: detected ? value : null,
      version: null,
      confidence,
      evidence: evidence.getAll(),
      reasoning: detected
        ? `Detected API type(s): ${types.join(", ")}${schemas.length > 0 ? ` with schemas: ${schemas.join(", ")}` : ""}`
        : "No API frameworks or configurations detected",
      duration,
    };
  },
};

function matchesPattern(path: string, pattern: string): boolean {
  const basename = path.split("/").pop() ?? path;
  const regex = new RegExp(
    "^" +
      pattern
        .replace(/\./g, "\\.")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".") +
      "$"
  );
  return regex.test(basename);
}

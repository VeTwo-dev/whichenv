import type {
  DetectionContext,
  DetectionResult,
  EnvironmentInfo,
  DetectorPlugin,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";

const ENV_FILE_PATTERNS = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
  ".env.test",
  ".env.test.local",
  ".env.staging",
  ".env.staging.local",
  ".env.example",
  ".env.sample",
];

const ENV_GLOB_PATTERNS = [".env.*.local"];

function parseEnvVariableNames(content: string): string[] {
  const names: string[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("export ")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    let key = trimmed.slice(0, eqIndex).trim();
    if (key.startsWith("export ")) {
      key = key.slice(7).trim();
    }
    if (key && !names.includes(key)) {
      names.push(key);
    }
  }
  return names;
}

export const detector: DetectorPlugin = {
  meta: {
    name: "environment",
    version: "1.0.0",
    description: "Detects .env files and their variable names",
    author: "whichenv",
    stage: "environment",
    priority: 40,
    dependencies: [],
    tags: ["env", "environment", "config", "secrets"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<EnvironmentInfo>> {
    const start = performance.now();
    const evidence = new EvidenceCollector();
    const files: string[] = [];
    const variables: Record<string, string[]> = {};

    for (const envFile of ENV_FILE_PATTERNS) {
      if (ctx.signal.aborted) break;

      if (await ctx.fs.exists(envFile)) {
        files.push(envFile);
        const content = await ctx.fs.readFile(envFile);
        if (content) {
          const names = parseEnvVariableNames(content);
          if (names.length > 0) {
            variables[envFile] = names;
          }
          evidence.addEnv(
            "environment-detector",
            `Found ${names.length} variable(s) in ${envFile}`,
          );
        } else {
          evidence.addFile("environment-detector", `Found empty env file: ${envFile}`, envFile);
        }
      }
    }

    for (const globPattern of ENV_GLOB_PATTERNS) {
      if (ctx.signal.aborted) break;

      const matches = await ctx.fs.glob(globPattern, ctx.root);
      for (const match of matches) {
        files.push(match);
        const content = await ctx.fs.readFile(match);
        if (content) {
          const names = parseEnvVariableNames(content);
          if (names.length > 0) {
            variables[match] = names;
          }
          evidence.addEnv(
            "environment-detector",
            `Found ${names.length} variable(s) in ${match}`,
          );
        }
      }
    }

    const duration = performance.now() - start;

    if (files.length === 0) {
      return {
        detected: false,
        name: "environment",
        value: null,
        version: null,
        confidence: 0,
        evidence: evidence.getAll(),
        reasoning: "No .env files detected",
        duration,
      };
    }

    const totalVars = Object.values(variables).reduce((sum, v) => sum + v.length, 0);
    const confidence = Math.min(100, 50 + files.length * 10 + totalVars * 2);

    return {
      detected: true,
      name: "environment",
      value: { files, variables },
      version: null,
      confidence,
      evidence: evidence.getAll(),
      reasoning: `Found ${files.length} .env file(s) with ${totalVars} total variable(s)`,
      duration,
    };
  },
};

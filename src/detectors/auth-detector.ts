import type {
  DetectionContext,
  DetectionResult,
  AuthInfo,
  AuthName,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";

interface AuthCandidate {
  name: AuthName;
  depNames: string[];
}

const candidates: AuthCandidate[] = [
  {
    name: "auth.js",
    depNames: ["next-auth", "@auth/core", "next-auth/v5", "auth"],
  },
  {
    name: "better-auth",
    depNames: ["better-auth"],
  },
  {
    name: "clerk",
    depNames: [
      "@clerk/nextjs",
      "@clerk/clerk-react",
      "@clerk/clerk-expo",
      "@clerk/clerk-fastify",
      "@clerk/express",
      "@clerk/backend",
    ],
  },
  {
    name: "firebase-auth",
    depNames: ["firebase", "firebase-admin"],
  },
  {
    name: "lucia",
    depNames: ["lucia"],
  },
  {
    name: "passport",
    depNames: ["passport", "passport-local", "passport-github2", "passport-google-oauth20"],
  },
  {
    name: "supabase-auth",
    depNames: [
      "@supabase/auth-helpers-nextjs",
      "@supabase/auth-helpers-react",
      "@supabase/auth-helpers-remix",
      "@supabase/ssr",
      "@supabase/supabase-js",
    ],
  },
];

function findDepVersion(
  ctx: DetectionContext,
  depNames: string[],
): { name: string; version: string } | null {
  for (const dep of depNames) {
    const version = ctx.dependencies.get(dep);
    if (version) return { name: dep, version };
    const devVersion = ctx.devDependencies.get(dep);
    if (devVersion) return { name: dep, version: devVersion };
  }
  return null;
}

export const detector = {
  meta: {
    name: "auth",
    version: "1.0.0",
    description: "Detects authentication libraries used in the project",
    author: "@vetwo",
    stage: "ecosystem",
    priority: 40,
    dependencies: [],
    tags: ["auth", "authentication", "clerk", "next-auth", "firebase", "lucia", "passport", "supabase"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<AuthInfo>> {
    const start = performance.now();
    const evidence = new EvidenceCollector();

    const detected: AuthInfo[] = [];

    for (const candidate of candidates) {
      const dep = findDepVersion(ctx, candidate.depNames);
      if (!dep) continue;

      evidence.addDependency(
        `auth/${candidate.name}`,
        `Found dependency ${dep.name}@${dep.version}`,
        dep.name,
      );

      detected.push({
        name: candidate.name,
        version: dep.version,
      });
    }

    const duration = performance.now() - start;

    if (detected.length === 0) {
      return {
        detected: false,
        name: "auth",
        value: null,
        version: null,
        confidence: 0,
        evidence: evidence.getAll(),
        reasoning: "No authentication libraries detected in dependencies",
        duration,
      };
    }

    const primary = detected[0]!;
    const confidence = Math.min(100, 70 + (detected.length > 1 ? 15 : 0) + 15);

    return {
      detected: true,
      name: primary.name,
      value: primary,
      version: primary.version,
      confidence,
      evidence: evidence.getAll(),
      reasoning: `Detected ${detected.length} auth library(ies): ${detected.map((d) => d.name).join(", ")}`,
      duration,
    };
  },
};

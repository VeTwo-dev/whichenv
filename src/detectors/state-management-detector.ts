import type {
  DetectionContext,
  DetectionResult,
  StateManagementInfo,
  StateManagementName,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";

interface StateCandidate {
  name: StateManagementName;
  depNames: string[];
}

const candidates: StateCandidate[] = [
  {
    name: "redux",
    depNames: ["@reduxjs/toolkit", "redux", "react-redux"],
  },
  {
    name: "zustand",
    depNames: ["zustand"],
  },
  {
    name: "mobx",
    depNames: ["mobx", "mobx-react-lite", "mobx-react"],
  },
  {
    name: "recoil",
    depNames: ["recoil"],
  },
  {
    name: "jotai",
    depNames: ["jotai"],
  },
  {
    name: "pinia",
    depNames: ["pinia"],
  },
  {
    name: "vuex",
    depNames: ["vuex", "@vuex/core"],
  },
  {
    name: "xstate",
    depNames: ["xstate", "@xstate/react", "@xstate/vue"],
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
    name: "state-management",
    version: "1.0.0",
    description: "Detects state management libraries used in the project",
    author: "@vetwo",
    stage: "ecosystem",
    priority: 45,
    dependencies: [],
    tags: ["state", "redux", "zustand", "mobx", "recoil", "jotai", "pinia", "vuex", "xstate"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<StateManagementInfo>> {
    const start = performance.now();
    const evidence = new EvidenceCollector();

    const detected: StateManagementInfo[] = [];

    for (const candidate of candidates) {
      const dep = findDepVersion(ctx, candidate.depNames);
      if (!dep) continue;

      evidence.addDependency(
        `state-management/${candidate.name}`,
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
        name: "state-management",
        value: null,
        version: null,
        confidence: 0,
        evidence: evidence.getAll(),
        reasoning: "No state management libraries detected in dependencies",
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
      reasoning: `Detected ${detected.length} state management library(ies): ${detected.map((d) => d.name).join(", ")}`,
      duration,
    };
  },
};

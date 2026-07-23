import type {
  DetectionContext,
  DetectionResult,
  UILibraryInfo,
  UILibraryName,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";

interface UILibraryCandidate {
  name: UILibraryName;
  depNames: string[];
  configFile?: string;
}

const candidates: UILibraryCandidate[] = [
  {
    name: "material-ui",
    depNames: ["@mui/material", "@mui/system", "@emotion/react", "@emotion/styled"],
  },
  {
    name: "chakra-ui",
    depNames: ["@chakra-ui/react", "@chakra-ui/core", "@chakra-ui/theme"],
  },
  {
    name: "ant-design",
    depNames: ["antd", "ant-design"],
  },
  {
    name: "mantine",
    depNames: ["@mantine/core", "@mantine/hooks"],
  },
  {
    name: "daisyui",
    depNames: ["daisyui"],
  },
  {
    name: "headless-ui",
    depNames: ["@headlessui/react", "@headlessui/vue"],
  },
  {
    name: "radix-ui",
    depNames: [
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-context-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-label",
      "@radix-ui/react-menubar",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
    ],
  },
  {
    name: "shadcn-ui",
    depNames: ["class-variance-authority", "clsx", "tailwind-merge"],
    configFile: "components.json",
  },
  {
    name: "primereact",
    depNames: ["primereact", "primeicons", "primeflex"],
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

function hasRadixDeps(ctx: DetectionContext): boolean {
  for (const dep of ctx.dependencies.keys()) {
    if (dep.startsWith("@radix-ui/react-")) return true;
  }
  for (const dep of ctx.devDependencies.keys()) {
    if (dep.startsWith("@radix-ui/react-")) return true;
  }
  return false;
}

export const detector = {
  meta: {
    name: "ui-library",
    version: "1.0.0",
    description: "Detects UI component libraries used in the project",
    author: "@vetwo",
    stage: "ecosystem",
    priority: 45,
    dependencies: [],
    tags: ["ui", "components", "material-ui", "chakra-ui", "ant-design", "mantine", "shadcn"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<UILibraryInfo>> {
    const start = performance.now();
    const evidence = new EvidenceCollector();

    const detected: UILibraryInfo[] = [];

    for (const candidate of candidates) {
      if (candidate.name === "radix-ui") {
        if (!hasRadixDeps(ctx)) continue;
        const dep = findDepVersion(ctx, candidate.depNames);
        if (dep) {
          evidence.addDependency(
            `ui-library/${candidate.name}`,
            `Found Radix UI dependency ${dep.name}@${dep.version}`,
            dep.name,
          );
          detected.push({ name: candidate.name, version: dep.version });
          continue;
        }
        continue;
      }

      if (candidate.name === "shadcn-ui") {
        if (candidate.configFile) {
          const configPath = `${ctx.root}/${candidate.configFile}`;
          if (await ctx.fs.exists(configPath)) {
            const parsed = await ctx.fs.readJSON(configPath);
            evidence.addConfig(
              `ui-library/${candidate.name}`,
              `Found shadcn/ui components.json`,
              configPath,
            );
            detected.push({ name: candidate.name, version: parsed?.["$schema"] ? "latest" : "latest" });
            continue;
          }
        }
        continue;
      }

      const dep = findDepVersion(ctx, candidate.depNames);
      if (!dep) continue;

      evidence.addDependency(
        `ui-library/${candidate.name}`,
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
        name: "ui-library",
        value: null,
        version: null,
        confidence: 0,
        evidence: evidence.getAll(),
        reasoning: "No UI libraries detected in dependencies",
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
      reasoning: `Detected ${detected.length} UI library(ies): ${detected.map((d) => d.name).join(", ")}`,
      duration,
    };
  },
};

import type {
  DetectionContext,
  DetectionResult,
  DeploymentInfo,
  DeploymentTarget,
  DetectorPlugin,
} from "../types/index.js";
import { EvidenceCollector } from "../core/evidence.js";

interface TargetCheck {
  target: DeploymentTarget;
  label: string;
  files: Array<{ glob?: string; exists?: string }>;
}

const targets: TargetCheck[] = [
  {
    target: "docker",
    label: "Docker",
    files: [{ exists: "Dockerfile" }, { glob: "Dockerfile.*" }],
  },
  {
    target: "docker-compose",
    label: "Docker Compose",
    files: [{ glob: "docker-compose.*" }, { glob: "compose.*" }],
  },
  {
    target: "kubernetes",
    label: "Kubernetes",
    files: [{ glob: "k8s/**/*.yaml" }, { glob: "k8s/**/*.yml" }, { glob: "kubernetes/**/*.yaml" }],
  },
  {
    target: "helm",
    label: "Helm",
    files: [{ glob: "helm/**/*" }, { exists: "Chart.yaml" }],
  },
  {
    target: "github-actions",
    label: "GitHub Actions",
    files: [{ glob: ".github/workflows/*" }],
  },
  {
    target: "gitlab-ci",
    label: "GitLab CI",
    files: [{ exists: ".gitlab-ci.yml" }],
  },
  {
    target: "circleci",
    label: "CircleCI",
    files: [{ exists: ".circleci/config.yml" }],
  },
  {
    target: "azure-pipelines",
    label: "Azure Pipelines",
    files: [{ exists: "azure-pipelines.yml" }],
  },
  {
    target: "vercel",
    label: "Vercel",
    files: [{ exists: "vercel.json" }, { exists: "now.json" }],
  },
  {
    target: "railway",
    label: "Railway",
    files: [{ exists: "railway.json" }],
  },
  {
    target: "netlify",
    label: "Netlify",
    files: [{ exists: "netlify.toml" }],
  },
  {
    target: "render",
    label: "Render",
    files: [{ exists: "render.yaml" }],
  },
  {
    target: "fly.io",
    label: "Fly.io",
    files: [{ exists: "fly.toml" }],
  },
];

function formatConfigPath(file: string): string {
  return file.replace(/^\//, "");
}

function inferFormat(filePath: string): string {
  if (filePath.endsWith(".json")) return "json";
  if (filePath.endsWith(".toml")) return "toml";
  if (filePath.endsWith(".yml") || filePath.endsWith(".yaml")) return "yaml";
  return "unknown";
}

export const detector: DetectorPlugin = {
  meta: {
    name: "deployment",
    version: "1.0.0",
    description: "Detects deployment targets and CI/CD configurations",
    author: "whichenv",
    stage: "deployment",
    priority: 50,
    dependencies: [],
    tags: ["deployment", "ci-cd", "docker", "kubernetes", "vercel"],
  },

  async detect(ctx: DetectionContext): Promise<DetectionResult<DeploymentInfo>> {
    const start = performance.now();
    const evidence = new EvidenceCollector();
    const detectedTargets: DeploymentTarget[] = [];
    const configs: Record<string, string> = {};

    for (const check of targets) {
      if (ctx.signal.aborted) break;

      let found = false;

      for (const file of check.files) {
        if (file.exists) {
          if (await ctx.fs.exists(file.exists)) {
            found = true;
            evidence.addFile(
              "deployment-detector",
              `${check.label} config found: ${file.exists}`,
              file.exists,
            );
            configs[file.exists] = inferFormat(file.exists);
            break;
          }
        } else if (file.glob) {
          const matches = await ctx.fs.glob(file.glob, ctx.root);
          if (matches.length > 0) {
            found = true;
            for (const match of matches) {
              evidence.addFile(
                "deployment-detector",
                `${check.label} config found: ${match}`,
                match,
              );
              configs[formatConfigPath(match)] = inferFormat(match);
            }
            break;
          }
        }
      }

      if (found) {
        detectedTargets.push(check.target);
      }
    }

    const duration = performance.now() - start;

    if (detectedTargets.length === 0) {
      return {
        detected: false,
        name: "deployment",
        value: null,
        version: null,
        confidence: 0,
        evidence: evidence.getAll(),
        reasoning: "No deployment targets or CI/CD configurations detected",
        duration,
      };
    }

    const confidence = Math.min(100, 40 + detectedTargets.length * 15);

    return {
      detected: true,
      name: "deployment",
      value: { targets: detectedTargets, configs },
      version: null,
      confidence,
      evidence: evidence.getAll(),
      reasoning: `Detected ${detectedTargets.length} deployment target(s): ${detectedTargets.join(", ")}`,
      duration,
    };
  },
};

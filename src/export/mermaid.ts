import type { SerializedProjectAnalysis } from "../types/project.js";
import type { DetectionResult } from "../types/detection.js";

const CATEGORY_COLORS: Record<string, string> = {
  runtime: "#4A90D9",
  workspace: "#50C878",
  packageManager: "#9B59B6",
  language: "#E74C3C",
  frameworks: "#E67E22",
  buildTools: "#1ABC9C",
  testing: "#2ECC71",
  linting: "#F1C40F",
  formatting: "#E91E63",
  styling: "#00BCD4",
  databases: "#FF5722",
  api: "#3F51B5",
  deployment: "#795548",
  git: "#607D8B",
  environment: "#8BC34A",
  configFiles: "#CDDC39",
  dependencies: "#FF9800",
  stateManagement: "#009688",
  uiLibraries: "#673AB7",
  auth: "#F44336",
};

function sanitizeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "_");
}

export function toMermaid(data: SerializedProjectAnalysis): string {
  const projectName = data.project.name ?? "project";
  const rootId = sanitizeId(projectName);

  const lines: string[] = [];
  lines.push("graph TD");
  lines.push(`    ${rootId}["${projectName}"]`);
  lines.push(`    style ${rootId} fill:#2c3e50,stroke:#2c3e50,color:#fff,font-weight:bold`);

  const techs: Array<{ name: string; category: string; version: string | null }> = [];

  const addSingles = (r: DetectionResult | null, cat: string) => {
    if (r?.detected) techs.push({ name: r.name, category: cat, version: r.version });
  };
  const addArr = (arr: DetectionResult[], cat: string) => {
    for (const r of arr) {
      if (r.detected) techs.push({ name: r.name, category: cat, version: r.version });
    }
  };

  addSingles(data.runtime, "runtime");
  addSingles(data.workspace, "workspace");
  addSingles(data.packageManager, "packageManager");
  addSingles(data.language, "language");
  addSingles(data.api, "api");
  addSingles(data.testing, "testing");
  addSingles(data.linting, "linting");
  addSingles(data.formatting, "formatting");
  addSingles(data.deployment, "deployment");
  addSingles(data.git, "git");
  addSingles(data.environment, "environment");
  addSingles(data.configFiles, "configFiles");
  addSingles(data.dependencies, "dependencies");
  addArr(data.frameworks, "frameworks");
  addArr(data.buildTools, "buildTools");
  addArr(data.styling, "styling");
  addArr(data.databases, "databases");
  addArr(data.stateManagement, "stateManagement");
  addArr(data.uiLibraries, "uiLibraries");
  addArr(data.auth, "auth");

  const usedIds = new Set<string>();
  for (const t of techs) {
    let id = sanitizeId(t.name);
    if (usedIds.has(id)) id = id + "_" + sanitizeId(t.category);
    usedIds.add(id);
    const label = t.version ? `${t.name}\\n${t.version}` : t.name;
    lines.push(`    ${rootId} --> ${id}["${label}"]`);
    const color = CATEGORY_COLORS[t.category] ?? "#95a5a6";
    lines.push(`    style ${id} fill:${color},stroke:${color},color:#fff`);
  }

  return lines.join("\n");
}

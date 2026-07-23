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

export function toGraphviz(data: SerializedProjectAnalysis): string {
  const projectName = data.project.name ?? "project";
  const rootId = sanitizeId(projectName);

  const lines: string[] = [];
  lines.push("digraph G {");
  lines.push('  rankdir=TD;');
  lines.push('  bgcolor="white";');
  lines.push('  node [shape=box, style=filled, fontname="Helvetica", fontsize=11];');
  lines.push('  edge [color="#555555"];');
  lines.push("");
  lines.push(`  ${rootId} [label="${projectName}", fillcolor="#2c3e50", fontcolor="white", fontsize=14, penwidth=2];`);
  lines.push("");

  const categoryNodes: Map<string, string[]> = new Map();

  const addSingles = (r: DetectionResult | null, cat: string) => {
    if (r?.detected) {
      if (!categoryNodes.has(cat)) categoryNodes.set(cat, []);
      categoryNodes.get(cat)!.push(r.name);
    }
  };
  const addArr = (arr: DetectionResult[], cat: string) => {
    for (const r of arr) {
      if (r.detected) {
        if (!categoryNodes.has(cat)) categoryNodes.set(cat, []);
        categoryNodes.get(cat)!.push(r.name);
      }
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

  for (const [cat, names] of categoryNodes) {
    lines.push(`  subgraph cluster_${sanitizeId(cat)} {`);
    lines.push(`    label="${cat}";`);
    lines.push(`    style=filled;`);
    lines.push(`    fillcolor="${CATEGORY_COLORS[cat] ?? "#ecf0f1"}22";`);
    lines.push(`    color="${CATEGORY_COLORS[cat] ?? "#bdc3c7"}";`);
    for (const name of names) {
      const id = sanitizeId(name) + "_" + sanitizeId(cat);
      lines.push(`    ${id} [label="${name}", fillcolor="${CATEGORY_COLORS[cat] ?? "#95a5a6"}", fontcolor="white"];`);
    }
    lines.push(`  }`);
    lines.push("");
  }

  for (const [cat, names] of categoryNodes) {
    for (const name of names) {
      const id = sanitizeId(name) + "_" + sanitizeId(cat);
      lines.push(`  ${rootId} -> ${id};`);
    }
  }

  lines.push("}");
  return lines.join("\n");
}

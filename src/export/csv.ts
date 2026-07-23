import type { SerializedProjectAnalysis } from "../types/project.js";

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCSV(data: SerializedProjectAnalysis): string {
  const lines: string[] = ["name,version,category,confidence"];

  const addResult = (name: string, version: string | null, category: string, confidence: number) => {
    lines.push(
      [escapeCSV(name), escapeCSV(version ?? ""), escapeCSV(category), String(confidence)].join(",")
    );
  };

  const singles: Array<[string, { detected: boolean; name: string; version: string | null; confidence: number } | null]> = [
    ["runtime", data.runtime],
    ["workspace", data.workspace],
    ["packageManager", data.packageManager],
    ["language", data.language],
    ["api", data.api],
    ["testing", data.testing],
    ["linting", data.linting],
    ["formatting", data.formatting],
    ["deployment", data.deployment],
    ["git", data.git],
    ["environment", data.environment],
    ["configFiles", data.configFiles],
    ["dependencies", data.dependencies],
  ];

  for (const [cat, r] of singles) {
    if (r?.detected) addResult(r.name, r.version, cat, r.confidence);
  }

  const arrays: Array<[string, Array<{ detected: boolean; name: string; version: string | null; confidence: number }>]> = [
    ["frameworks", data.frameworks],
    ["buildTools", data.buildTools],
    ["styling", data.styling],
    ["databases", data.databases],
    ["stateManagement", data.stateManagement],
    ["uiLibraries", data.uiLibraries],
    ["auth", data.auth],
  ];

  for (const [cat, arr] of arrays) {
    for (const r of arr) {
      if (r.detected) addResult(r.name, r.version, cat, r.confidence);
    }
  }

  return lines.join("\n");
}

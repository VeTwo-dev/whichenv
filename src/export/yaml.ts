import type { SerializedProjectAnalysis } from "../types/project.js";
import type { DetectionResult } from "../types/detection.js";

function yamlScalar(value: string | null | number | boolean): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (/[:{}\[\],&*?|>!%@`#\-]/.test(value) || /^\s|\s$/.test(value) || value === "") {
      return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  return `"${String(value)}"`;
}

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line.length > 0 ? pad + line : line))
    .join("\n");
}

function resultToYaml(r: DetectionResult, pad: number): string {
  const lines: string[] = [];
  const p = " ".repeat(pad);
  lines.push(`${p}detected: ${r.detected}`);
  lines.push(`${p}name: ${yamlScalar(r.name)}`);
  lines.push(`${p}version: ${yamlScalar(r.version)}`);
  lines.push(`${p}confidence: ${r.confidence}`);
  if (r.reasoning) lines.push(`${p}reasoning: ${yamlScalar(r.reasoning)}`);
  return lines.join("\n");
}

export function toYAML(data: SerializedProjectAnalysis): string {
  const lines: string[] = [];
  const p = data.project;

  lines.push("project:");
  lines.push(`  name: ${yamlScalar(p.name)}`);
  lines.push(`  version: ${yamlScalar(p.version)}`);
  lines.push(`  description: ${yamlScalar(p.description)}`);
  lines.push(`  type: ${yamlScalar(p.type)}`);
  lines.push(`  license: ${yamlScalar(p.license)}`);
  lines.push(`  author: ${yamlScalar(p.author)}`);
  lines.push("");

  const singles: Array<[string, DetectionResult | null]> = [
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

  for (const [key, val] of singles) {
    lines.push(`${key}:`);
    if (val) {
      lines.push(indent(resultToYaml(val, 2), 0));
    } else {
      lines.push("  detected: false");
    }
    lines.push("");
  }

  const arrays: Array<[string, DetectionResult[]]> = [
    ["frameworks", data.frameworks],
    ["buildTools", data.buildTools],
    ["styling", data.styling],
    ["databases", data.databases],
    ["stateManagement", data.stateManagement],
    ["uiLibraries", data.uiLibraries],
    ["auth", data.auth],
  ];

  for (const [key, arr] of arrays) {
    lines.push(`${key}:`);
    if (arr.length === 0) {
      lines.push("  []");
    } else {
      for (const r of arr) {
        lines.push(`  - name: ${yamlScalar(r.name)}`);
        lines.push(`    detected: ${r.detected}`);
        lines.push(`    version: ${yamlScalar(r.version)}`);
        lines.push(`    confidence: ${r.confidence}`);
      }
    }
    lines.push("");
  }

  const m = data.metrics;
  lines.push("metrics:");
  lines.push(`  healthScore: ${m.healthScore}`);
  lines.push(`  complexityScore: ${m.complexityScore}`);
  lines.push(`  maintainabilityScore: ${m.maintainabilityScore}`);
  lines.push(`  maturityScore: ${m.maturityScore}`);
  lines.push(`  productionReadiness: ${m.productionReadiness}`);
  lines.push(`  architectureScore: ${m.architectureScore}`);
  lines.push(`  dependencyHealth: ${m.dependencyHealth}`);
  lines.push(`  testingCoverage: ${m.testingCoverage}`);
  lines.push(`  documentationScore: ${m.documentationScore}`);
  lines.push(`  securityScore: ${m.securityScore}`);
  lines.push(`  performanceScore: ${m.performanceScore}`);
  lines.push("");

  lines.push("recommendations:");
  if (data.recommendations.length === 0) {
    lines.push("  []");
  } else {
    for (const rec of data.recommendations) {
      lines.push(`  - severity: ${yamlScalar(rec.severity)}`);
      lines.push(`    category: ${yamlScalar(rec.category)}`);
      lines.push(`    title: ${yamlScalar(rec.title)}`);
      lines.push(`    description: ${yamlScalar(rec.description)}`);
      lines.push(`    impact: ${yamlScalar(rec.impact)}`);
      lines.push(`    fix: ${yamlScalar(rec.fix)}`);
    }
  }
  lines.push("");

  lines.push("capabilities:");
  if (data.capabilities.length === 0) {
    lines.push("  []");
  } else {
    for (const cap of data.capabilities) {
      lines.push(`  - ${yamlScalar(cap)}`);
    }
  }
  lines.push("");

  lines.push(`confidence: ${data.confidence}`);
  lines.push(`duration: ${data.duration}`);
  lines.push(`timestamp: ${data.timestamp}`);

  return lines.join("\n");
}

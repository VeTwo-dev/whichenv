import pc from "picocolors";
import { intro, spinner, outro } from "@clack/prompts";
import { detectProject } from "../../core/engine.js";
import { theme } from "../ui/theme.js";
import { formatHealthScore, formatVersion, formatDuration } from "../utils/format.js";
import type { ProjectAnalysis } from "../../types/project.js";
import type { DetectionResult } from "../../types/detection.js";

export async function summaryCommand(args: Record<string, unknown>): Promise<void> {
  const s = spinner();

  intro(`${theme.colors.primary("whichenv")} ${theme.icons.chart} Project Summary`);

  s.start("Analyzing project...");

  const root = typeof args.root === "string" ? args.root : undefined;
  const analysis = await detectProject({ root });

  s.stop(`Analysis complete in ${formatDuration(analysis.duration)}`);

  console.log("");
  drawBox("Project Overview", [
    `${pc.bold("Name")}    ${pc.cyan(analysis.project.name ?? "unknown")}`,
    `${pc.bold("Version")} ${formatVersion(analysis.project.version)}`,
    `${pc.bold("Type")}    ${pc.white(analysis.project.type)}`,
    `${pc.bold("Path")}    ${pc.dim(truncate(analysis.project.root, 50))}`,
  ]);

  console.log("");

  const health = formatHealthScore(analysis.metrics.healthScore);
  const healthColor = health.color;

  drawBox("Health Score", [
    `${healthColor(pc.bold(pc.underline(`${analysis.metrics.healthScore}/100`)))}  ${healthColor(health.label)}`,
    "",
    `${pc.bold("Architecture")}     ${scoreBar(analysis.metrics.architectureScore)}`,
    `${pc.bold("Dependencies")}     ${scoreBar(analysis.metrics.dependencyHealth)}`,
    `${pc.bold("Testing")}          ${scoreBar(analysis.metrics.testingCoverage)}`,
    `${pc.bold("Security")}         ${scoreBar(analysis.metrics.securityScore)}`,
    `${pc.bold("Performance")}      ${scoreBar(analysis.metrics.performanceScore)}`,
    `${pc.bold("Maintainability")}  ${scoreBar(analysis.metrics.maintainabilityScore)}`,
    `${pc.bold("Maturity")}         ${scoreBar(analysis.metrics.maturityScore)}`,
  ]);

  console.log("");

  const keyItems: Array<{ label: string; value: string }> = [];

  if (analysis.runtime.detected) {
    const v = analysis.runtime.value as { name: string } | null;
    keyItems.push({ label: "Runtime", value: v?.name ?? analysis.runtime.name });
  }
  if (analysis.packageManager.detected) {
    const v = analysis.packageManager.value as { name: string } | null;
    keyItems.push({ label: "Package Manager", value: v?.name ?? analysis.packageManager.name });
  }
  if (analysis.frameworks.length > 0) {
    keyItems.push({
      label: "Framework",
      value: analysis.frameworks.map((f) => f.name).join(", "),
    });
  }
  if (analysis.buildTools.length > 0) {
    keyItems.push({
      label: "Build Tools",
      value: analysis.buildTools.map((b) => b.name).join(", "),
    });
  }
  if (analysis.testing.detected) {
    const v = analysis.testing.value as { frameworks: string[] } | null;
    keyItems.push({
      label: "Testing",
      value: v?.frameworks?.join(", ") ?? analysis.testing.name,
    });
  }
  if (analysis.linting.detected) {
    keyItems.push({ label: "Linting", value: analysis.linting.name });
  }

  if (keyItems.length > 0) {
    drawBox("Key Stack", keyItems.map(
      (item) => `${pc.bold(padRight(item.label, 20))} ${pc.white(item.value)}`
    ));
    console.log("");
  }

  if (analysis.capabilities.length > 0) {
    const maxPerLine = 3;
    const lines: string[] = [];
    for (let i = 0; i < analysis.capabilities.length; i += maxPerLine) {
      const chunk = analysis.capabilities.slice(i, i + maxPerLine);
      lines.push(
        chunk.map((c) => `${theme.icons.checkmark} ${pc.dim(c)}`).join("   ")
      );
    }
    drawBox("Capabilities", lines);
    console.log("");
  }

  outro(pc.green("Done!"));
}

function drawBox(title: string, lines: string[]): void {
  const width = 60;
  const pad = 2;

  console.log(`${pc.dim("┌")}─${pc.bold(pc.cyan(title))} ${pc.dim("─".repeat(Math.max(0, width - title.length - 4)))}${pc.dim("┐")}`);

  for (const line of lines) {
    const stripped = stripAnsi(line);
    const padding = Math.max(0, width - stripped.length - pad * 2);
    console.log(`${pc.dim("│")}${" ".repeat(pad)}${line}${" ".repeat(padding + pad)}${pc.dim("│")}`);
  }

  console.log(`${pc.dim("└")}${pc.dim("─".repeat(width))}${pc.dim("┘")}`);
}

function scoreBar(score: number): string {
  const width = 25;
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;

  let color: (str: string) => string;
  if (score >= 70) color = pc.green;
  else if (score >= 40) color = pc.yellow;
  else color = pc.red;

  return `${color("█".repeat(filled))}${pc.dim("░".repeat(empty))} ${color(String(score))}`;
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}

function padRight(str: string, len: number): string {
  if (str.length >= len) return str;
  return str + " ".repeat(len - str.length);
}

function stripAnsi(str: string): string {
  return str.replace(
    // eslint-disable-next-line no-control-regex
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ""
  );
}

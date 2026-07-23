import pc from "picocolors";
import { intro, outro, select, spinner } from "@clack/prompts";
import { detectProject } from "../../core/engine.js";
import { theme } from "../ui/theme.js";
import { formatHealthScore, formatVersion, formatDuration, formatConfidence } from "../utils/format.js";
import type { ProjectAnalysis } from "../../types/project.js";

interface MenuItem {
  label: string;
  value: string;
  hint?: string;
}

const MENU_ITEMS: MenuItem[] = [
  { label: "Project Summary", value: "summary", hint: "View project overview dashboard" },
  { label: "Detect Environment", value: "detect", hint: "Run full environment detection" },
  { label: "Framework Details", value: "frameworks", hint: "View detected frameworks" },
  { label: "Runtime Details", value: "runtime", hint: "View runtime information" },
  { label: "Package Manager", value: "package-manager", hint: "View package manager info" },
  { label: "Capabilities", value: "capabilities", hint: "View project capabilities" },
  { label: "Configuration Files", value: "config", hint: "View detected config files" },
  { label: "Diagnostics", value: "doctor", hint: "Run health diagnostics" },
  { label: "Health Score", value: "health", hint: "View health score breakdown" },
  { label: "Recommendations", value: "recommendations", hint: "View improvement suggestions" },
  { label: "Export Results", value: "export", hint: "Export analysis to file" },
  { label: "Exit", value: "exit", hint: "Exit the wizard" },
];

export async function wizardCommand(args: Record<string, unknown>): Promise<void> {
  const s = spinner();

  intro(
    `${theme.icons.rocket} ${pc.bold(pc.cyan("whichenv"))} ${pc.dim("—")} ${pc.white("Project Intelligence Wizard")}`
  );

  console.log(`  ${pc.dim("Detect frameworks, runtimes, build tools, and every aspect of your project.")}`);
  console.log("");

  s.start("Scanning project...");

  const root = typeof args.root === "string" ? args.root : undefined;
  const analysis = await detectProject({ root });

  s.stop(`Found ${countDetected(analysis)} technologies in ${formatDuration(analysis.duration)}`);

  console.log("");

  let running = true;

  while (running) {
    const choice = await select({
      message: "What would you like to do?",
      options: MENU_ITEMS,
    });

    if (choice === "exit" || choice === undefined) {
      running = false;
      continue;
    }

    console.log("");

    switch (choice) {
      case "summary":
        showSummary(analysis);
        break;
      case "detect":
        await handleDetect(root);
        break;
      case "frameworks":
        showFrameworks(analysis);
        break;
      case "runtime":
        showRuntime(analysis);
        break;
      case "package-manager":
        showPackageManager(analysis);
        break;
      case "capabilities":
        showCapabilities(analysis);
        break;
      case "config":
        showConfig(analysis);
        break;
      case "doctor":
        showDoctor(analysis);
        break;
      case "health":
        showHealth(analysis);
        break;
      case "recommendations":
        showRecommendations(analysis);
        break;
      case "export":
        await handleExport(analysis);
        break;
    }

    console.log("");
  }

  outro(pc.green("Thanks for using whichenv!"));
}

function countDetected(a: ProjectAnalysis): number {
  let count = 0;
  if (a.runtime.detected) count++;
  if (a.language.detected) count++;
  if (a.packageManager.detected) count++;
  for (const f of a.frameworks) if (f.detected) count++;
  for (const b of a.buildTools) if (b.detected) count++;
  for (const s of a.styling) if (s.detected) count++;
  for (const d of a.databases) if (d.detected) count++;
  if (a.testing.detected) count++;
  if (a.linting.detected) count++;
  if (a.formatting.detected) count++;
  if (a.api.detected) count++;
  if (a.deployment.detected) count++;
  if (a.workspace.detected) count++;
  if (a.git.detected) count++;
  for (const sm of a.stateManagement) if (sm.detected) count++;
  for (const ui of a.uiLibraries) if (ui.detected) count++;
  for (const au of a.auth) if (au.detected) count++;
  return count;
}

function showSummary(a: ProjectAnalysis): void {
  const health = formatHealthScore(a.metrics.healthScore);

  console.log(pc.bold(pc.underline("Project Summary")));
  console.log("");
  console.log(`  ${pc.bold("Name")}     ${pc.cyan(a.project.name ?? "unknown")}`);
  console.log(`  ${pc.bold("Version")}  ${formatVersion(a.project.version)}`);
  console.log(`  ${pc.bold("Type")}     ${pc.white(a.project.type)}`);
  console.log(`  ${pc.bold("Root")}     ${pc.dim(a.project.root)}`);
  console.log("");

  if (a.runtime.detected) {
    const v = a.runtime.value as { name: string } | null;
    console.log(`  ${pc.bold("Runtime")}        ${pc.white(v?.name ?? a.runtime.name)}`);
  }
  if (a.language.detected) {
    const v = a.language.value as { primary: string } | null;
    console.log(`  ${pc.bold("Language")}       ${pc.white(v?.primary ?? a.language.name)}`);
  }
  if (a.packageManager.detected) {
    const v = a.packageManager.value as { name: string } | null;
    console.log(`  ${pc.bold("Pkg Manager")}   ${pc.white(v?.name ?? a.packageManager.name)}`);
  }
  if (a.frameworks.length > 0) {
    console.log(`  ${pc.bold("Frameworks")}     ${pc.white(a.frameworks.map((f) => f.name).join(", "))}`);
  }
  if (a.buildTools.length > 0) {
    console.log(`  ${pc.bold("Build Tools")}    ${pc.white(a.buildTools.map((b) => b.name).join(", "))}`);
  }
  if (a.testing.detected) {
    const v = a.testing.value as { frameworks: string[] } | null;
    console.log(`  ${pc.bold("Testing")}        ${pc.white(v?.frameworks?.join(", ") ?? a.testing.name)}`);
  }

  console.log("");
  console.log(`  ${theme.icons.chart} Health: ${health.color(pc.bold(`${a.metrics.healthScore}/100`))} ${health.color(health.label)}`);
  console.log(`  ${theme.icons.clock} Duration: ${pc.dim(formatDuration(a.duration))}`);
}

async function handleDetect(root: string | undefined): Promise<void> {
  const s = spinner();
  s.start("Re-detecting environment...");
  const analysis = await detectProject({ root });
  s.stop(`Detection complete in ${formatDuration(analysis.duration)}`);
  console.log("");
  showSummary(analysis);
}

function showFrameworks(a: ProjectAnalysis): void {
  console.log(pc.bold(pc.underline("Framework Details")));
  console.log("");

  if (a.frameworks.length === 0) {
    console.log(`  ${theme.icons.info} ${pc.dim("No frameworks detected.")}`);
    return;
  }

  for (const f of a.frameworks) {
    console.log(`  ${theme.icons.checkmark} ${pc.bold(pc.white(f.name))} ${formatVersion(f.version)}`);
    console.log(`    ${pc.dim("Confidence:")} ${formatConfidence(f.confidence)}`);
    if (f.evidence.length > 0) {
      console.log(`    ${pc.dim("Evidence:")}`);
      for (const e of f.evidence.slice(0, 3)) {
        console.log(`      ${theme.icons.bullet} ${pc.dim(e.source)}: ${pc.dim(e.detail)}`);
      }
    }
    console.log("");
  }
}

function showRuntime(a: ProjectAnalysis): void {
  console.log(pc.bold(pc.underline("Runtime Details")));
  console.log("");

  if (!a.runtime.detected) {
    console.log(`  ${theme.icons.info} ${pc.dim("No runtime detected.")}`);
    return;
  }

  const v = a.runtime.value as { name: string; version?: string; capabilities?: string[] } | null;
  console.log(`  ${pc.bold("Name")}         ${pc.white(v?.name ?? a.runtime.name)}`);
  console.log(`  ${pc.bold("Version")}      ${formatVersion(a.runtime.version ?? v?.version ?? null)}`);
  console.log(`  ${pc.bold("Confidence")}   ${formatConfidence(a.runtime.confidence)}`);

  if (v?.capabilities && v.capabilities.length > 0) {
    console.log(`  ${pc.bold("Capabilities")} ${pc.dim(v.capabilities.join(", "))}`);
  }

  if (a.runtime.evidence.length > 0) {
    console.log("");
    console.log(`  ${pc.dim("Evidence:")}`);
    for (const e of a.runtime.evidence.slice(0, 5)) {
      console.log(`    ${theme.icons.bullet} ${pc.dim(e.source)}: ${pc.dim(e.detail)}`);
    }
  }
}

function showPackageManager(a: ProjectAnalysis): void {
  console.log(pc.bold(pc.underline("Package Manager")));
  console.log("");

  if (!a.packageManager.detected) {
    console.log(`  ${theme.icons.info} ${pc.dim("No package manager detected.")}`);
    return;
  }

  const v = a.packageManager.value as { name: string; lockfile?: string } | null;
  console.log(`  ${pc.bold("Name")}      ${pc.white(v?.name ?? a.packageManager.name)}`);
  console.log(`  ${pc.bold("Version")}   ${formatVersion(a.packageManager.version)}`);
  console.log(`  ${pc.bold("Confidence")} ${formatConfidence(a.packageManager.confidence)}`);

  if (v?.lockfile) {
    console.log(`  ${pc.bold("Lockfile")}  ${pc.dim(v.lockfile)}`);
  }
}

function showCapabilities(a: ProjectAnalysis): void {
  console.log(pc.bold(pc.underline("Project Capabilities")));
  console.log("");

  if (a.capabilities.length === 0) {
    console.log(`  ${theme.icons.info} ${pc.dim("No capabilities detected.")}`);
    return;
  }

  const groups = new Map<string, string[]>();
  for (const cap of a.capabilities) {
    const parts = cap.includes(":") ? cap.split(":") : ["general", cap];
    const group = parts[0] ?? "general";
    const name = parts[1] ?? cap;
    const list = groups.get(group) ?? [];
    list.push(name);
    groups.set(group, list);
  }

  for (const [group, caps] of groups) {
    console.log(`  ${pc.bold(pc.cyan(group))}`);
    for (const cap of caps) {
      console.log(`    ${theme.icons.checkmark} ${pc.dim(cap)}`);
    }
  }
}

function showConfig(a: ProjectAnalysis): void {
  console.log(pc.bold(pc.underline("Configuration Files")));
  console.log("");

  if (!a.configFiles.detected) {
    console.log(`  ${theme.icons.info} ${pc.dim("No configuration files detected.")}`);
    return;
  }

  const v = a.configFiles.value as { files?: string[] } | null;
  if (v?.files && v.files.length > 0) {
    for (const file of v.files) {
      console.log(`  ${theme.icons.file} ${pc.dim(file)}`);
    }
  } else {
    console.log(`  ${theme.icons.checkmark} ${pc.dim("Configuration files present.")}`);
  }
}

function showDoctor(a: ProjectAnalysis): void {
  console.log(pc.bold(pc.underline("Diagnostics")));
  console.log("");

  const { errors, warnings, suggestions, info: infoItems } = a.diagnostics;

  for (const item of errors) {
    console.log(`  ${theme.icons.error} ${pc.red(pc.bold(item.code))}: ${pc.white(item.message)}`);
    if (item.fix) console.log(`    ${theme.icons.info} ${pc.blue(item.fix)}`);
  }

  for (const item of warnings) {
    console.log(`  ${theme.icons.warning} ${pc.yellow(pc.bold(item.code))}: ${pc.white(item.message)}`);
    if (item.fix) console.log(`    ${theme.icons.info} ${pc.blue(item.fix)}`);
  }

  for (const item of suggestions) {
    console.log(`  ${theme.icons.info} ${pc.blue(item.code)}: ${pc.white(item.message)}`);
  }

  for (const item of infoItems) {
    console.log(`  ${pc.dim("·")} ${pc.dim(item.code)}: ${pc.dim(item.message)}`);
  }

  console.log("");
  const total =
    errors.length + warnings.length + suggestions.length + infoItems.length;
  if (total === 0) {
    console.log(`  ${theme.icons.checkmark} ${pc.green("No issues found.")}`);
  } else {
    console.log(
      `  ${pc.dim(`${a.diagnostics.passed} passed, `)}` +
        `${pc.yellow(`${warnings.length} warnings, `)}` +
        `${pc.red(`${errors.length} errors`)}`
    );
  }
}

function showHealth(a: ProjectAnalysis): void {
  console.log(pc.bold(pc.underline("Health Score Breakdown")));
  console.log("");

  const health = formatHealthScore(a.metrics.healthScore);
  console.log(`  ${pc.bold("Overall")}  ${health.color(pc.bold(pc.underline(`${a.metrics.healthScore}/100`)))}  ${health.color(health.label)}`);
  console.log("");

  const metrics: Array<{ label: string; value: number }> = [
    { label: "Architecture", value: a.metrics.architectureScore },
    { label: "Dependencies", value: a.metrics.dependencyHealth },
    { label: "Testing", value: a.metrics.testingCoverage },
    { label: "Security", value: a.metrics.securityScore },
    { label: "Performance", value: a.metrics.performanceScore },
    { label: "Maintainability", value: a.metrics.maintainabilityScore },
    { label: "Maturity", value: a.metrics.maturityScore },
    { label: "Documentation", value: a.metrics.documentationScore },
    { label: "Complexity", value: a.metrics.complexityScore },
    { label: "Production Readiness", value: a.metrics.productionReadiness },
  ];

  for (const m of metrics) {
    const bar = scoreBar(m.value);
    console.log(`  ${pc.bold(padRight(m.label, 22))} ${bar}`);
  }
}

function showRecommendations(a: ProjectAnalysis): void {
  console.log(pc.bold(pc.underline("Recommendations")));
  console.log("");

  if (a.recommendations.length === 0) {
    console.log(`  ${theme.icons.checkmark} ${pc.green("No recommendations. Project looks great!")}`);
    return;
  }

  for (const rec of a.recommendations) {
    const color = theme.severityColor(rec.severity);
    const icon = theme.severityIcon(rec.severity);
    console.log(`  ${icon} ${color(pc.bold(`[${rec.severity.toUpperCase()}]`))} ${pc.bold(rec.title)}`);
    console.log(`    ${pc.white(rec.description)}`);
    if (rec.fix) {
      console.log(`    ${theme.icons.arrow} ${pc.cyan(rec.fix)}`);
    }
    console.log("");
  }
}

async function handleExport(a: ProjectAnalysis): Promise<void> {
  const format = await select({
    message: "Select export format:",
    options: [
      { label: "JSON", value: "json" },
      { label: "Markdown", value: "markdown" },
      { label: "HTML", value: "html" },
      { label: "YAML", value: "yaml" },
      { label: "CSV", value: "csv" },
      { label: "Mermaid", value: "mermaid" },
    ],
  });

  if (!format) return;

  const output = a.export(format as "json" | "markdown" | "html" | "yaml" | "csv" | "mermaid");
  console.log(output);
  console.log("");
  console.log(`  ${theme.icons.checkmark} ${pc.green("Export complete.")}`);
}

function scoreBar(score: number): string {
  const width = 20;
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;

  let color: (str: string) => string;
  if (score >= 70) color = pc.green;
  else if (score >= 40) color = pc.yellow;
  else color = pc.red;

  return `${color("█".repeat(filled))}${pc.dim("░".repeat(empty))} ${color(String(score))}`;
}

function padRight(str: string, len: number): string {
  if (str.length >= len) return str;
  return str + " ".repeat(len - str.length);
}

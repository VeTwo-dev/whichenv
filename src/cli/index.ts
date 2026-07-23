#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import pc from "picocolors";
import { detectProject } from "../core/engine.js";
import { theme } from "./ui/theme.js";
import { formatDuration } from "./utils/format.js";

const detect = defineCommand({
  meta: {
    name: "detect",
    description: "Run environment detection and print results",
  },
  args: {
    root: {
      type: "string",
      description: "Project root directory",
    },
    verbose: {
      type: "boolean",
      description: "Enable verbose output",
      default: false,
    },
  },
  async run({ args }) {
    const { detectCommand } = await import("./commands/detect.js");
    await detectCommand(args);
  },
});

const summary = defineCommand({
  meta: {
    name: "summary",
    description: "Print project summary dashboard",
  },
  args: {
    root: {
      type: "string",
      description: "Project root directory",
    },
  },
  async run({ args }) {
    const { summaryCommand } = await import("./commands/summary.js");
    await summaryCommand(args);
  },
});

const doctor = defineCommand({
  meta: {
    name: "doctor",
    description: "Run diagnostics and print results",
  },
  args: {
    root: {
      type: "string",
      description: "Project root directory",
    },
  },
  async run({ args }) {
    const { doctorCommand } = await import("./commands/doctor.js");
    await doctorCommand(args);
  },
});

const graph = defineCommand({
  meta: {
    name: "graph",
    description: "Generate dependency graph in Mermaid format",
  },
  args: {
    root: {
      type: "string",
      description: "Project root directory",
    },
  },
  async run({ args }) {
    const { graphCommand } = await import("./commands/graph.js");
    await graphCommand(args);
  },
});

const exportCmd = defineCommand({
  meta: {
    name: "export",
    description: "Export results to file",
  },
  args: {
    root: {
      type: "string",
      description: "Project root directory",
    },
    format: {
      type: "string",
      description: "Export format (json/markdown/html/yaml/csv/mermaid)",
      default: "json",
    },
    output: {
      type: "string",
      description: "Output file path",
    },
  },
  async run({ args }) {
    const { exportCommand } = await import("./commands/export.js");
    await exportCommand(args);
  },
});

const watch = defineCommand({
  meta: {
    name: "watch",
    description: "Watch mode — re-run detection on file changes",
  },
  args: {
    root: {
      type: "string",
      description: "Project root directory",
    },
  },
  async run({ args }) {
    const { watchCommand } = await import("./commands/watch.js");
    await watchCommand(args);
  },
});

const wizard = defineCommand({
  meta: {
    name: "wizard",
    description: "Interactive wizard (default experience)",
  },
  args: {
    root: {
      type: "string",
      description: "Project root directory",
    },
  },
  async run({ args }) {
    const { wizardCommand } = await import("./commands/wizard.js");
    await wizardCommand(args);
  },
});

const main = defineCommand({
  meta: {
    name: "whichenv",
    version: "0.1.0",
    description: "The most advanced JavaScript & TypeScript Project Intelligence Engine",
  },
  args: {
    root: {
      type: "string",
      description: "Project root directory (defaults to cwd)",
    },
    verbose: {
      type: "boolean",
      description: "Enable verbose output",
      default: false,
    },
    quiet: {
      type: "boolean",
      description: "Suppress non-error output",
      default: false,
    },
  },
  subCommands: {
    detect,
    summary,
    doctor,
    graph,
    export: exportCmd,
    watch,
    wizard,
  },
  async run({ args }) {
    const { intro, spinner, outro } = await import("@clack/prompts");
    const s = spinner();

    intro(`${theme.icons.rocket} ${pc.bold(pc.cyan("whichenv"))} ${pc.dim("— Project Intelligence")}`);

    s.start("Scanning project...");

    const root = typeof args.root === "string" ? args.root : undefined;
    const verbose = args.verbose === true;

    const analysis = await detectProject({ root, verbose });

    s.stop(`Detected ${countDetected(analysis)} technologies in ${formatDuration(analysis.duration)}`);

    console.log("");

    const healthColor =
      analysis.metrics.healthScore >= 70 ? pc.green :
      analysis.metrics.healthScore >= 40 ? pc.yellow :
      pc.red;

    console.log(
      `  ${theme.icons.diamond} ${pc.bold(pc.cyan(analysis.project.name ?? "unknown"))}` +
        (analysis.project.version ? ` ${pc.dim(`v${analysis.project.version}`)}` : "") +
        pc.dim(`  ${analysis.project.type}`)
    );
    console.log(
      `  ${theme.icons.chart} Health: ${healthColor(pc.bold(`${analysis.metrics.healthScore}/100`))}` +
        pc.dim(`  Confidence: ${analysis.confidence}%`)
    );
    console.log("");

    const sections = [
      { label: "Runtime", result: analysis.runtime },
      { label: "Language", result: analysis.language },
      { label: "Pkg Manager", result: analysis.packageManager },
      { label: "Testing", result: analysis.testing },
      { label: "Linting", result: analysis.linting },
    ];

    for (const sec of sections) {
      if (sec.result.detected) {
        const ver = sec.result.version ? pc.dim(`v${sec.result.version}`) : pc.dim("—");
        console.log(`  ${theme.icons.checkmark} ${pc.white(padRight(sec.label, 16))} ${pc.white(sec.result.name)} ${ver}`);
      }
    }

    for (const f of analysis.frameworks) {
      if (f.detected) {
        const ver = f.version ? pc.dim(`v${f.version}`) : pc.dim("—");
        console.log(`  ${theme.icons.checkmark} ${pc.white(padRight("Framework", 16))} ${pc.white(f.name)} ${ver}`);
      }
    }

    for (const b of analysis.buildTools) {
      if (b.detected) {
        const ver = b.version ? pc.dim(`v${b.version}`) : pc.dim("—");
        console.log(`  ${theme.icons.checkmark} ${pc.white(padRight("Build Tool", 16))} ${pc.white(b.name)} ${ver}`);
      }
    }

    console.log("");
    console.log(
      `  ${pc.dim("Run")} ${pc.bold(pc.cyan("whichenv wizard"))} ${pc.dim("for the full interactive experience.")}`
    );
    console.log("");

    outro(pc.green("Done!"));
  },
});

runMain(main);

function countDetected(a: ReturnType<typeof detectProject> extends Promise<infer T> ? T : never): number {
  let count = 0;
  if (a.runtime.detected) count++;
  if (a.language.detected) count++;
  if (a.packageManager.detected) count++;
  for (const f of a.frameworks) if (f.detected) count++;
  for (const b of a.buildTools) if (b.detected) count++;
  for (const s of a.styling) if (s.detected) count++;
  if (a.testing.detected) count++;
  if (a.linting.detected) count++;
  if (a.formatting.detected) count++;
  for (const d of a.databases) if (d.detected) count++;
  if (a.api.detected) count++;
  if (a.deployment.detected) count++;
  if (a.workspace.detected) count++;
  if (a.git.detected) count++;
  for (const sm of a.stateManagement) if (sm.detected) count++;
  for (const ui of a.uiLibraries) if (ui.detected) count++;
  for (const au of a.auth) if (au.detected) count++;
  return count;
}

function padRight(str: string, len: number): string {
  if (str.length >= len) return str;
  return str + " ".repeat(len - str.length);
}

import pc from "picocolors";
import { intro, spinner, outro } from "@clack/prompts";
import { detectProject } from "../../core/engine.js";
import { theme } from "../ui/theme.js";
import { formatConfidence, formatVersion, formatDuration } from "../utils/format.js";
import type { DetectionResult } from "../../types/detection.js";

export async function detectCommand(args: Record<string, unknown>): Promise<void> {
  const s = spinner();

  intro(`${theme.colors.primary("whichenv")} ${theme.icons.sparkle} Environment Detection`);

  s.start("Scanning project...");

  const root = typeof args.root === "string" ? args.root : undefined;
  const verbose = args.verbose === true;

  const analysis = await detectProject({ root, verbose });

  s.stop(`Detection complete in ${formatDuration(analysis.duration)}`);

  console.log("");
  console.log(
    `${theme.icons.diamond} ${pc.bold("Project")}     ${pc.cyan(analysis.project.name ?? "unknown")}` +
      (analysis.project.version ? ` ${formatVersion(analysis.project.version)}` : "")
  );
  console.log(`${theme.icons.bullet} ${pc.bold("Type")}        ${pc.white(analysis.project.type)}`);
  console.log(`${theme.icons.bullet} ${pc.bold("Root")}        ${pc.dim(analysis.project.root)}`);
  console.log("");

  const sections: Array<{ title: string; results: DetectionResult[] }> = [
    { title: "Runtime", results: [analysis.runtime] },
    { title: "Language", results: [analysis.language] },
    { title: "Package Manager", results: [analysis.packageManager] },
    { title: "Frameworks", results: analysis.frameworks },
    { title: "Build Tools", results: analysis.buildTools },
    { title: "Styling", results: analysis.styling },
    { title: "Testing", results: [analysis.testing] },
    { title: "Linting", results: [analysis.linting] },
    { title: "Formatting", results: [analysis.formatting] },
    { title: "Databases", results: analysis.databases },
    { title: "State Management", results: analysis.stateManagement },
    { title: "UI Libraries", results: analysis.uiLibraries },
    { title: "Auth", results: analysis.auth },
    { title: "API", results: [analysis.api] },
    { title: "Deployment", results: [analysis.deployment] },
    { title: "Workspace", results: [analysis.workspace] },
    { title: "Git", results: [analysis.git] },
  ];

  for (const section of sections) {
    const detected = section.results.filter((r) => r.detected);
    if (detected.length === 0) continue;

    console.log(pc.bold(pc.underline(section.title)));
    for (const r of detected) {
      const name = r.name;
      const version = formatVersion(r.version);
      const conf = formatConfidence(r.confidence);
      console.log(`  ${theme.icons.checkmark} ${pc.white(padRight(name, 22))} ${version}  ${conf}`);
    }
    console.log("");
  }

  const detectedCount = [
    analysis.runtime,
    analysis.language,
    analysis.packageManager,
    ...analysis.frameworks,
    ...analysis.buildTools,
    ...analysis.styling,
    analysis.testing,
    analysis.linting,
    analysis.formatting,
    ...analysis.databases,
    ...analysis.stateManagement,
    ...analysis.uiLibraries,
    ...analysis.auth,
    analysis.api,
    analysis.deployment,
    analysis.workspace,
    analysis.git,
  ].filter((r) => r.detected).length;

  console.log(pc.dim("─".repeat(60)));
  console.log(
    `  ${theme.icons.chart} ${pc.bold("Summary")} ` +
      `${theme.icons.arrow} ${pc.cyan(String(detectedCount))} technologies detected ` +
      `in ${formatDuration(analysis.duration)}`
  );
  console.log("");

  outro(pc.green("Done!"));
}

function padRight(str: string, len: number): string {
  if (str.length >= len) return str;
  return str + " ".repeat(len - str.length);
}

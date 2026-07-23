import * as fs from "node:fs";
import * as path from "node:path";
import pc from "picocolors";
import { intro, outro } from "@clack/prompts";
import { detectProject } from "../../core/engine.js";
import { theme } from "../ui/theme.js";
import { formatHealthScore, formatDuration, formatConfidence } from "../utils/format.js";

const WATCH_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte",
  ".json", ".yaml", ".yml", ".toml",
]);

const WATCH_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".nuxt"]);

export async function watchCommand(args: Record<string, unknown>): Promise<void> {
  const root = typeof args.root === "string" ? args.root : process.cwd();

  intro(`${theme.colors.primary("whichenv")} ${theme.icons.gear} Watch Mode`);
  console.log(`  ${theme.icons.bullet} ${pc.dim(`Watching: ${pc.white(root)}`)}`);
  console.log(`  ${theme.icons.bullet} ${pc.dim("Press")} ${pc.bold("Ctrl+C")} ${pc.dim("to stop")}`);
  console.log("");

  let analysis = await detectProject({ root });
  printDashboard(analysis);

  let debounceTimer: NodeJS.Timeout | null = null;

  const watcher = fs.watch(root, { recursive: true }, (event, filename) => {
    if (!filename) return;

    const ext = path.extname(filename).toLowerCase();
    const parts = filename.split(path.sep);
    if (parts.some((p) => WATCH_DIRS.has(p))) return;
    if (!WATCH_EXTENSIONS.has(ext)) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      console.log(pc.dim(`\n${theme.icons.clock} Change detected: ${pc.white(filename)} (${event})`));
      console.log(pc.dim("Re-analyzing...\n"));

      analysis = await detectProject({ root });
      printDashboard(analysis);
    }, 300);
  });

  const cleanup = (): void => {
    if (debounceTimer) clearTimeout(debounceTimer);
    watcher.close();
    console.log("");
    outro(pc.green("Watch mode stopped."));
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

function printDashboard(analysis: ReturnType<typeof detectProject> extends Promise<infer T> ? T : never): void {
  const health = formatHealthScore(analysis.metrics.healthScore);
  const healthColor = health.color;

  console.log(pc.dim("─".repeat(55)));
  console.log(
    `${theme.icons.diamond} ${pc.bold(pc.cyan(analysis.project.name ?? "unknown"))}` +
      (analysis.project.version ? ` ${pc.dim(`v${analysis.project.version}`)}` : "") +
      pc.dim(`  ${analysis.project.type}`)
  );
  console.log(
    `${theme.icons.chart} Health: ${healthColor(pc.bold(`${analysis.metrics.healthScore}/100`))} ${healthColor(health.label)}` +
      pc.dim(`  Confidence: ${analysis.confidence}%`) +
      pc.dim(`  ${formatDuration(analysis.duration)}`)
  );
  console.log("");

  const techs: Array<{ name: string; version: string | null; confidence: number }> = [];

  if (analysis.runtime.detected) techs.push({ name: analysis.runtime.name, version: analysis.runtime.version, confidence: analysis.runtime.confidence });
  if (analysis.language.detected) techs.push({ name: analysis.language.name, version: analysis.language.version, confidence: analysis.language.confidence });
  if (analysis.packageManager.detected) techs.push({ name: analysis.packageManager.name, version: analysis.packageManager.version, confidence: analysis.packageManager.confidence });

  for (const f of analysis.frameworks) {
    if (f.detected) techs.push({ name: f.name, version: f.version, confidence: f.confidence });
  }
  for (const b of analysis.buildTools) {
    if (b.detected) techs.push({ name: b.name, version: b.version, confidence: b.confidence });
  }

  if (analysis.testing.detected) techs.push({ name: analysis.testing.name, version: analysis.testing.version, confidence: analysis.testing.confidence });
  if (analysis.linting.detected) techs.push({ name: analysis.linting.name, version: analysis.linting.version, confidence: analysis.linting.confidence });

  for (const t of techs) {
    const conf = formatConfidence(t.confidence);
    const ver = t.version ? pc.dim(`v${t.version}`) : pc.dim("—");
    console.log(`  ${theme.icons.checkmark} ${pc.white(padRight(t.name, 20))} ${ver}  ${conf}`);
  }

  console.log(pc.dim("─".repeat(55)));
  console.log("");
}

function padRight(str: string, len: number): string {
  if (str.length >= len) return str;
  return str + " ".repeat(len - str.length);
}

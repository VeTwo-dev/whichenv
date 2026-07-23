import * as fs from "node:fs/promises";
import * as path from "node:path";
import pc from "picocolors";
import { intro, spinner, outro } from "@clack/prompts";
import { detectProject } from "../../core/engine.js";
import { theme } from "../ui/theme.js";
import { formatDuration } from "../utils/format.js";
import type { ExportFormat } from "../../types/project.js";

const SUPPORTED_FORMATS: ExportFormat[] = ["json", "markdown", "html", "yaml", "csv", "mermaid", "tree", "graphviz"];

export async function exportCommand(args: Record<string, unknown>): Promise<void> {
  const s = spinner();

  const format = (typeof args.format === "string" ? args.format : "json") as string;
  const outputFile = typeof args.output === "string" ? args.output : undefined;

  if (!SUPPORTED_FORMATS.includes(format as ExportFormat)) {
    console.error(pc.red(`Unsupported format: ${format}`));
    console.error(pc.dim(`Supported formats: ${SUPPORTED_FORMATS.join(", ")}`));
    process.exit(1);
  }

  intro(`${theme.colors.primary("whichenv")} ${theme.icons.file} Export`);

  s.start("Generating export...");

  const root = typeof args.root === "string" ? args.root : undefined;
  const analysis = await detectProject({ root });

  const output = analysis.export(format as ExportFormat);

  s.stop(`Export generated in ${formatDuration(analysis.duration)}`);

  if (outputFile) {
    const resolved = path.resolve(outputFile);
    const dir = path.dirname(resolved);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(resolved, output, "utf-8");
    console.log("");
    console.log(`  ${theme.icons.checkmark} ${pc.green("Exported to")} ${pc.cyan(resolved)}`);
    console.log(`  ${theme.icons.bullet} ${pc.dim(`Format: ${format}`)}`);
    console.log(`  ${theme.icons.bullet} ${pc.dim(`Size: ${Buffer.byteLength(output).toLocaleString()} bytes`)}`);
  } else {
    console.log("");
    console.log(output);
  }

  console.log("");
  outro(pc.green("Done!"));
}

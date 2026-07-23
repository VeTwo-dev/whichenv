import pc from "picocolors";
import { intro, spinner, outro } from "@clack/prompts";
import { detectProject } from "../../core/engine.js";
import { theme } from "../ui/theme.js";
import { formatDuration } from "../utils/format.js";

export async function doctorCommand(args: Record<string, unknown>): Promise<void> {
  const s = spinner();

  intro(`${theme.colors.primary("whichenv")} ${theme.icons.shield} Diagnostics`);

  s.start("Running diagnostics...");

  const root = typeof args.root === "string" ? args.root : undefined;
  const analysis = await detectProject({ root });

  s.stop(`Diagnostics complete in ${formatDuration(analysis.duration)}`);

  console.log("");

  let passedCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  const errors = analysis.diagnostics.errors;
  const warnings = analysis.diagnostics.warnings;
  const suggestions = analysis.diagnostics.suggestions;
  const info = analysis.diagnostics.info;

  if (errors.length > 0) {
    console.log(pc.bold(pc.red("Errors")));
    console.log("");
    for (const item of errors) {
      console.log(`  ${theme.icons.error} ${pc.red(pc.bold(item.code))}`);
      console.log(`    ${pc.white(item.message)}`);
      if (item.fix) {
        console.log(`    ${theme.icons.info} ${pc.blue(item.fix)}`);
      }
      console.log("");
      errorCount++;
    }
  }

  if (warnings.length > 0) {
    console.log(pc.bold(pc.yellow("Warnings")));
    console.log("");
    for (const item of warnings) {
      console.log(`  ${theme.icons.warning} ${pc.yellow(pc.bold(item.code))}`);
      console.log(`    ${pc.white(item.message)}`);
      if (item.fix) {
        console.log(`    ${theme.icons.info} ${pc.blue(item.fix)}`);
      }
      if (item.impact) {
        console.log(`    ${pc.dim(`Impact: ${item.impact}`)}`);
      }
      console.log("");
      warningCount++;
    }
  }

  if (suggestions.length > 0) {
    console.log(pc.bold(pc.blue("Suggestions")));
    console.log("");
    for (const item of suggestions) {
      console.log(`  ${theme.icons.info} ${pc.blue(pc.bold(item.code))}`);
      console.log(`    ${pc.white(item.message)}`);
      if (item.fix) {
        console.log(`    ${theme.icons.arrow} ${pc.cyan(item.fix)}`);
      }
      console.log("");
    }
  }

  if (info.length > 0) {
    console.log(pc.bold(pc.dim("Information")));
    console.log("");
    for (const item of info) {
      console.log(`  ${pc.dim("·")} ${pc.dim(item.code)}: ${pc.dim(item.message)}`);
    }
    console.log("");
  }

  if (errors.length === 0 && warnings.length === 0 && suggestions.length === 0 && info.length === 0) {
    console.log(`  ${theme.icons.checkmark} ${pc.green("All checks passed! No issues found.")}`);
    passedCount = 10;
    console.log("");
  } else {
    passedCount = analysis.diagnostics.passed;
  }

  console.log(pc.dim("─".repeat(50)));
  const summaryParts: string[] = [];
  if (passedCount > 0) summaryParts.push(pc.green(`${passedCount} passed`));
  if (warningCount > 0) summaryParts.push(pc.yellow(`${warningCount} warning${warningCount > 1 ? "s" : ""}`));
  if (errorCount > 0) summaryParts.push(pc.red(`${errorCount} error${errorCount > 1 ? "s" : ""}`));
  if (suggestions.length > 0) summaryParts.push(pc.blue(`${suggestions.length} suggestion${suggestions.length > 1 ? "s" : ""}`));

  console.log(`  ${theme.icons.chart} ${summaryParts.join(pc.dim(" · "))}`);
  console.log("");

  outro(
    errorCount > 0
      ? pc.red("Issues found. Review errors above.")
      : warningCount > 0
        ? pc.yellow("Some warnings detected. Consider addressing them.")
        : pc.green("All good!")
  );
}

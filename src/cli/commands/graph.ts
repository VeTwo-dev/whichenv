import pc from "picocolors";
import { intro, spinner, outro } from "@clack/prompts";
import { detectProject } from "../../core/engine.js";
import { theme } from "../ui/theme.js";
import { formatDuration } from "../utils/format.js";

export async function graphCommand(args: Record<string, unknown>): Promise<void> {
  const s = spinner();

  intro(`${theme.colors.primary("whichenv")} ${theme.icons.link} Dependency Graph`);

  s.start("Analyzing project dependencies...");

  const root = typeof args.root === "string" ? args.root : undefined;
  const analysis = await detectProject({ root });

  s.stop(`Analysis complete in ${formatDuration(analysis.duration)}`);

  console.log("");

  const mermaid = analysis.toMermaid();

  console.log(pc.bold(pc.cyan("Mermaid Graph Output")));
  console.log(pc.dim("─".repeat(40)));
  console.log("");
  console.log(pc.white(mermaid));
  console.log("");
  console.log(pc.dim("─".repeat(40)));
  console.log(
    `${theme.icons.info} ${pc.dim("Paste the above into a Mermaid renderer (e.g. mermaid.live) to view the graph.")}`
  );
  console.log("");

  outro(pc.green("Done!"));
}

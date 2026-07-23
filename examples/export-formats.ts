/**
 * Export formats example for @vetwo/whichenv
 */
import { detectProject } from "../src/index.js";
import * as fs from "node:fs/promises";

async function main() {
  const project = await detectProject();

  // Export as different formats
  const formats = [
    { name: "json", content: project.toJSON(), ext: "json" },
    { name: "markdown", content: project.toMarkdown(), ext: "md" },
    { name: "html", content: project.toHTML(), ext: "html" },
    { name: "yaml", content: project.toYAML(), ext: "yaml" },
    { name: "csv", content: project.export("csv"), ext: "csv" },
    { name: "mermaid", content: project.toMermaid(), ext: "mmd" },
    { name: "graphviz", content: project.export("graphviz"), ext: "dot" },
    { name: "tree", content: project.toTree(), ext: "txt" },
  ];

  console.log("Available export formats:");
  for (const format of formats) {
    console.log(`  ${format.name}: ${format.content.length} characters`);

    // Write to file
    const filename = `export-example.${format.ext}`;
    await fs.writeFile(filename, format.content, "utf-8");
    console.log(`  → Written to ${filename}`);
  }
}

main().catch(console.error);

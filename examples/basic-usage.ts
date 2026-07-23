/**
 * Basic usage example for @vetwo/whichenv
 */
import { detectProject } from "../src/index.js";

async function main() {
  // Detect the current project
  const project = await detectProject();

  // Print a summary
  console.log(project.summary());

  // Check specific technologies
  console.log("\n--- Convenience Checks ---");
  console.log("isReact:", project.isReact());
  console.log("isNext:", project.isNext());
  console.log("isNode:", project.isNode());
  console.log("isBun:", project.isBun());
  console.log("hasTailwind:", project.hasTailwind());
  console.log("hasPrisma:", project.hasPrisma());
  console.log("hasDocker:", project.hasDocker());
  console.log("hasVitest:", project.hasVitest());
  console.log("hasWorkspace:", project.hasWorkspace());

  // Health score
  console.log(`\nHealth Score: ${project.metrics.healthScore}/100`);

  // Recommendations
  if (project.recommendations.length > 0) {
    console.log("\nRecommendations:");
    for (const rec of project.recommendations) {
      console.log(`  [${rec.severity}] ${rec.title}`);
      console.log(`    ${rec.description}`);
      if (rec.fix) console.log(`    Fix: ${rec.fix}`);
    }
  }

  // Capabilities
  console.log("\nCapabilities:", project.capabilities);

  // Export as different formats
  console.log("\n--- Markdown Report ---");
  console.log(project.toMarkdown());
}

main().catch(console.error);

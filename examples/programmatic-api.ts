/**
 * Programmatic API example for @vetwo/whichenv
 */
import {
  detectProject,
  WhichenvEngine,
  EventEmitter,
  createLogger,
} from "../src/index.js";
import type { DetectionResult, WhichenvEvents } from "../src/index.js";

async function main() {
  // === Basic Usage ===
  console.log("=== Basic Usage ===");
  const project = await detectProject({ root: process.cwd() });
  console.log(project.summary());

  // === Using the Engine directly ===
  console.log("\n=== Engine Usage ===");
  const engine = new WhichenvEngine({ verbose: true });

  // Listen to events
  const emitter = new EventEmitter<WhichenvEvents>();
  emitter.on("detection:result", (data) => {
    if (data.result.detected) {
      console.log(`  Detected: ${data.result.name} (${data.confidence}%)`);
    }
  });

  const result = await engine.detect();
  console.log(`\nDetected ${result.capabilities.length} capabilities`);

  // === Working with Results ===
  console.log("\n=== Results Analysis ===");
  console.log(`Project: ${result.project.name}`);
  console.log(`Type: ${result.project.type}`);
  console.log(`Health: ${result.metrics.healthScore}/100`);
  console.log(`Confidence: ${result.confidence}%`);

  // Check specific results
  if (result.runtime.detected) {
    console.log(`Runtime: ${result.runtime.name} v${result.runtime.version}`);
  }
  if (result.language.detected) {
    const lang = result.language.value as { primary: string } | null;
    console.log(`Language: ${lang?.primary}`);
  }

  // === Custom Logger ===
  console.log("\n=== Custom Logger ===");
  const customLogger = createLogger({ level: "debug", prefix: "my-app" });
  customLogger.info("Custom logger works!");
  customLogger.debug("Debug messages visible with level: debug");

  // === Serialization ===
  console.log("\n=== Serialization ===");
  const serialized = result.toJSON();
  console.log(`Serialized size: ${JSON.stringify(serialized).length} bytes`);

  // === Recommendations ===
  console.log("\n=== Recommendations ===");
  for (const rec of result.recommendations.slice(0, 5)) {
    console.log(`[${rec.severity.toUpperCase()}] ${rec.title}`);
  }
}

main().catch(console.error);

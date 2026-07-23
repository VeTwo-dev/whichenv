/**
 * Custom plugin example for @vetwo/whichenv
 */
import { detectProject, type DetectorPlugin } from "../src/index.js";

// Define a custom detector plugin
const myCustomDetector: DetectorPlugin = {
  meta: {
    name: "my-custom-tool",
    version: "1.0.0",
    description: "Detects the presence of my-custom-tool",
    author: "custom",
    stage: "tooling",
    priority: 50,
    dependencies: [],
    tags: ["custom", "my-tool"],
  },
  async detect(ctx) {
    const startTime = Date.now();
    const evidence: Array<{ source: string; type: "dependency" | "config" | "file"; detail: string; path?: string }> = [];

    // Check dependencies
    const hasDep = ctx.packageJson?.dependencies?.["my-custom-tool"]
      || ctx.packageJson?.devDependencies?.["my-custom-tool"];

    if (hasDep) {
      evidence.push({
        source: "package.json",
        type: "dependency",
        detail: `Found my-custom-tool: ${String(hasDep)}`,
      });
    }

    // Check for config file
    const hasConfig = await ctx.fs.exists(ctx.root + "/my-tool.config.js");
    if (hasConfig) {
      evidence.push({
        source: "config",
        type: "config",
        detail: "Found my-tool.config.js",
        path: "my-tool.config.js",
      });
    }

    const detected = evidence.length > 0;

    return {
      detected,
      name: "my-custom-tool",
      value: detected ? { name: "my-custom-tool", version: String(hasDep ?? "unknown") } : null,
      version: detected ? String(hasDep ?? null) : null,
      confidence: detected ? (evidence.length > 1 ? 95 : 80) : 0,
      evidence,
      reasoning: detected
        ? `Detected my-custom-tool via ${evidence.map(e => e.type).join(" and ")}`
        : "my-custom-tool not found",
      duration: Date.now() - startTime,
    };
  },
};

async function main() {
  // Create engine and register custom plugin
  const project = await detectProject();

  // The custom plugin would be registered via:
  // const engine = new WhichenvEngine();
  // engine.registry.register(myCustomDetector);
  // const result = await engine.detect();

  console.log("Detection complete!");
  console.log(project.summary());
}

main().catch(console.error);

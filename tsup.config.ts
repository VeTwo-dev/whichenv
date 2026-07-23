import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    treeshake: true,
    minify: false,
    target: "es2022",
    outDir: "dist",
    skipNodeModulesBundle: true,
    platform: "neutral",
    banner: {
      js: "// @vetwo/whichenv — JavaScript & TypeScript Project Intelligence Engine",
    },
  },
  {
    entry: { "cli/index": "src/cli/index.ts" },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: false,
    splitting: false,
    treeshake: true,
    minify: false,
    target: "node18",
    outDir: "dist",
    platform: "node",
  },
]);

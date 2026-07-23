import * as nodePath from "node:path";

export const path = {
  join: (...segments: string[]) => nodePath.join(...segments),
  resolve: (...segments: string[]) => nodePath.resolve(...segments),
  dirname: (p: string) => nodePath.dirname(p),
  basename: (p: string, ext?: string) => nodePath.basename(p, ext),
  extname: (p: string) => nodePath.extname(p),
  relative: (from: string, to: string) => nodePath.relative(from, to),
  normalize: (p: string) => nodePath.normalize(p),
  isAbsolute: (p: string) => nodePath.isAbsolute(p),
  sep: nodePath.sep,
};

export function findUp(startDir: string, filenames: string[]): string | null {
  let current = startDir;
  while (true) {
    for (const filename of filenames) {
      const candidate = nodePath.join(current, filename);
      try {
        const fs = require("node:fs") as typeof import("node:fs");
        if (fs.statSync(candidate, { throwIfNoEntry: false })) {
          return candidate;
        }
      } catch {
        // continue
      }
    }
    const parent = nodePath.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

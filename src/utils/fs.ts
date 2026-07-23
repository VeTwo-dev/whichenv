import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as nodePath from "node:path";
import type { FileSystemAdapter } from "../types/plugin.js";

const JSONC_RE = /^\s*\/\//;

function parseJsonWithComments(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const cleaned = text
      .split("\n")
      .filter(line => !JSONC_RE.test(line) && !line.trim().startsWith("//"))
      .join("\n");
    try {
      return JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

export function createFileSystem(root: string): FileSystemAdapter {
  return {
    async readFile(filePath: string): Promise<string | null> {
      try {
        return await fs.readFile(filePath, "utf-8");
      } catch {
        return null;
      }
    },

    async readJSON(filePath: string): Promise<Record<string, unknown> | null> {
      const content = await createFileSystem(root).readFile(filePath);
      if (!content) return null;

      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".json" || ext === ".jsonc") {
        return parseJsonWithComments(content);
      }
      return null;
    },

    async exists(filePath: string): Promise<boolean> {
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    },

    async readDir(dirPath: string): Promise<string[]> {
      try {
        return await fs.readdir(dirPath);
      } catch {
        return [];
      }
    },

    async glob(pattern: string, cwd: string): Promise<string[]> {
      const { glob } = await import("glob" as string).catch(() => ({
        glob: async (_p: string, _o: unknown): Promise<string[]> => [],
      }));
      try {
        return await glob(pattern, { cwd, absolute: true, nodir: true });
      } catch {
        return [];
      }
    },
  };
}

export { path as nodePath, fs as nodeFs };

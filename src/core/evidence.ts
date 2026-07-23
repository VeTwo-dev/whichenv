import type { Evidence } from "../types/detection.js";

/**
 * Evidence collector for building detection results.
 */
export class EvidenceCollector {
  private items: Evidence[] = [];

  add(type: Evidence["type"], source: string, detail: string, filePath?: string): void {
    this.items.push({
      source,
      type,
      detail,
      path: filePath,
      timestamp: Date.now(),
    });
  }

  addFile(source: string, detail: string, filePath: string): void {
    this.add("file", source, detail, filePath);
  }

  addDependency(source: string, detail: string, pkgName?: string): void {
    this.add("dependency", source, detail, pkgName);
  }

  addConfig(source: string, detail: string, configPath: string): void {
    this.add("config", source, detail, configPath);
  }

  addLockfile(source: string, detail: string, lockfilePath: string): void {
    this.add("lockfile", source, detail, lockfilePath);
  }

  addStructure(source: string, detail: string): void {
    this.add("structure", source, detail);
  }

  addCode(source: string, detail: string, filePath: string): void {
    this.add("code", source, detail, filePath);
  }

  addEnv(source: string, detail: string): void {
    this.add("env", source, detail);
  }

  addGit(source: string, detail: string): void {
    this.add("git", source, detail);
  }

  getAll(): Evidence[] {
    return [...this.items];
  }

  clear(): void {
    this.items = [];
  }

  get count(): number {
    return this.items.length;
  }
}

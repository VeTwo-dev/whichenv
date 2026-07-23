import { describe, it, expect } from "vitest";
import { EvidenceCollector } from "../../src/core/evidence.js";

describe("EvidenceCollector", () => {
  it("should collect evidence", () => {
    const collector = new EvidenceCollector();
    collector.add("dependency", "test", "found dep");
    collector.add("config", "test", "found config");

    expect(collector.count).toBe(2);
    expect(collector.getAll()).toHaveLength(2);
  });

  it("should add typed evidence", () => {
    const collector = new EvidenceCollector();
    collector.addFile("test", "found file", "/path/to/file");
    collector.addDependency("test", "found dep", "pkg");
    collector.addConfig("test", "found config", "config.json");
    collector.addLockfile("test", "found lock", "lock.json");
    collector.addStructure("test", "found dir");
    collector.addCode("test", "found import", "file.ts");
    collector.addEnv("test", "found .env");
    collector.addGit("test", "found git");

    expect(collector.count).toBe(8);
    const items = collector.getAll();
    expect(items.map(e => e.type)).toEqual([
      "file", "dependency", "config", "lockfile", "structure", "code", "env", "git",
    ]);
  });

  it("should clear evidence", () => {
    const collector = new EvidenceCollector();
    collector.add("dependency", "test", "found dep");
    expect(collector.count).toBe(1);

    collector.clear();
    expect(collector.count).toBe(0);
  });

  it("should return copies of evidence", () => {
    const collector = new EvidenceCollector();
    collector.add("dependency", "test", "found dep");

    const items1 = collector.getAll();
    const items2 = collector.getAll();

    expect(items1).not.toBe(items2);
    expect(items1).toEqual(items2);
  });
});

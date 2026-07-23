import { describe, it, expect } from "vitest";
import { detectProject } from "../../src/core/engine.js";

describe("detectProject", () => {
  it("should detect the current project", async () => {
    const project = await detectProject();

    expect(project).toBeDefined();
    expect(project.project).toBeDefined();
    expect(project.project.name).toBe("@vetwo/whichenv");
    expect(project.project.version).toBe("1.0.0");
    expect(project.timestamp).toBeGreaterThan(0);
    expect(project.duration).toBeGreaterThanOrEqual(0);
  });

  it("should detect vitest as a testing framework", async () => {
    const project = await detectProject();

    expect(project.testing.detected).toBe(true);
    const value = project.testing.value as { frameworks: string[] } | null;
    expect(value?.frameworks).toContain("vitest");
  });

  it("should detect typescript", async () => {
    const project = await detectProject();

    expect(project.language.detected).toBe(true);
  });

  it("should have convenience methods", async () => {
    const project = await detectProject();

    expect(typeof project.isReact).toBe("function");
    expect(typeof project.isNext).toBe("function");
    expect(typeof project.isNode).toBe("function");
    expect(typeof project.isBun).toBe("function");
    expect(typeof project.hasVitest).toBe("function");
    expect(typeof project.hasTailwind).toBe("function");
    expect(typeof project.summary).toBe("function");
    expect(typeof project.toJSON).toBe("function");
    expect(typeof project.toMarkdown).toBe("function");
  });

  it("should generate a summary", async () => {
    const project = await detectProject();
    const summary = project.summary();

    expect(typeof summary).toBe("string");
    expect(summary).toContain("@vetwo/whichenv");
  });

  it("should serialize to JSON", async () => {
    const project = await detectProject();
    const json = project.toJSON();

    expect(json).toBeDefined();
    expect(json.project.name).toBe("@vetwo/whichenv");
    expect(typeof json.confidence).toBe("number");
    expect(typeof json.metrics).toBe("object");
  });

  it("should export to markdown", async () => {
    const project = await detectProject();
    const md = project.toMarkdown();

    expect(typeof md).toBe("string");
    expect(md).toContain("#");
    expect(md).toContain("@vetwo/whichenv");
  });

  it("should have health metrics", async () => {
    const project = await detectProject();

    expect(project.metrics).toBeDefined();
    expect(project.metrics.healthScore).toBeGreaterThanOrEqual(0);
    expect(project.metrics.healthScore).toBeLessThanOrEqual(100);
  });

  it("should have recommendations array", async () => {
    const project = await detectProject();

    expect(Array.isArray(project.recommendations)).toBe(true);
  });

  it("should have capabilities array", async () => {
    const project = await detectProject();

    expect(Array.isArray(project.capabilities)).toBe(true);
  });
});

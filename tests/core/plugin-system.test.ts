import { describe, it, expect } from "vitest";
import { PluginRegistry } from "../../src/core/plugin-system.js";
import type { DetectorPlugin } from "../../src/types/plugin.js";

function createMockDetector(name: string, stage: string, priority: number): DetectorPlugin {
  return {
    meta: {
      name,
      version: "1.0.0",
      description: `Mock detector: ${name}`,
      author: "test",
      stage,
      priority,
      dependencies: [],
      tags: [],
    },
    async detect() {
      return {
        detected: true,
        name,
        value: { name },
        version: "1.0.0",
        confidence: 80,
        evidence: [],
        reasoning: `Detected ${name}`,
        duration: 10,
      };
    },
  };
}

describe("PluginRegistry", () => {
  it("should register and retrieve plugins", () => {
    const registry = new PluginRegistry();
    const detector = createMockDetector("test-detector", "tooling", 50);
    registry.register(detector);

    expect(registry.has("test-detector")).toBe(true);
    expect(registry.get("test-detector")).toBe(detector);
  });

  it("should throw on duplicate registration", () => {
    const registry = new PluginRegistry();
    registry.register(createMockDetector("test", "tooling", 50));

    expect(() => {
      registry.register(createMockDetector("test", "tooling", 50));
    }).toThrow('Plugin "test" is already registered');
  });

  it("should disable and enable plugins", () => {
    const registry = new PluginRegistry();
    registry.register(createMockDetector("test", "tooling", 50));

    expect(registry.isEnabled("test")).toBe(true);
    registry.disable("test");
    expect(registry.isEnabled("test")).toBe(false);
    expect(registry.get("test")).toBeUndefined();

    registry.enable("test");
    expect(registry.isEnabled("test")).toBe(true);
    expect(registry.get("test")).toBeDefined();
  });

  it("should get plugins by stage", () => {
    const registry = new PluginRegistry();
    registry.register(createMockDetector("a", "tooling", 50));
    registry.register(createMockDetector("b", "tooling", 80));
    registry.register(createMockDetector("c", "runtime", 90));

    const tooling = registry.getByStage("tooling");
    expect(tooling).toHaveLength(2);
    expect(tooling[0]!.meta.name).toBe("b"); // Higher priority first
    expect(tooling[1]!.meta.name).toBe("a");
  });

  it("should remove plugins", () => {
    const registry = new PluginRegistry();
    registry.register(createMockDetector("test", "tooling", 50));
    expect(registry.has("test")).toBe(true);

    registry.remove("test");
    expect(registry.has("test")).toBe(false);
  });

  it("should list all plugin names", () => {
    const registry = new PluginRegistry();
    registry.register(createMockDetector("a", "tooling", 50));
    registry.register(createMockDetector("b", "runtime", 60));

    expect(registry.listNames()).toEqual(["a", "b"]);
    expect(registry.listEnabledNames()).toEqual(["a", "b"]);

    registry.disable("a");
    expect(registry.listEnabledNames()).toEqual(["b"]);
  });

  it("should resolve dependencies order", () => {
    const registry = new PluginRegistry();
    registry.register(createMockDetector("a", "tooling", 50));
    registry.register(createMockDetector("b", "tooling", 60));

    const order = registry.resolveDependencies();
    expect(order).toContain("a");
    expect(order).toContain("b");
  });
});

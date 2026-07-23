import { describe, it, expect } from "vitest";
import { MemoryCache } from "../../src/cache/memory-cache.js";

describe("MemoryCache", () => {
  it("should store and retrieve values", () => {
    const cache = new MemoryCache();
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  it("should return null for missing keys", () => {
    const cache = new MemoryCache();
    expect(cache.get("missing")).toBeNull();
  });

  it("should support TTL expiration", async () => {
    const cache = new MemoryCache();
    cache.set("key1", "value1", 50); // 50ms TTL
    expect(cache.get("key1")).toBe("value1");

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(cache.get("key1")).toBeNull();
  });

  it("should check key existence", () => {
    const cache = new MemoryCache();
    expect(cache.has("key1")).toBe(false);
    cache.set("key1", "value1");
    expect(cache.has("key1")).toBe(true);
  });

  it("should clear all entries", () => {
    const cache = new MemoryCache();
    cache.set("key1", "value1");
    cache.set("key2", "value2");
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("should delete individual entries", () => {
    const cache = new MemoryCache();
    cache.set("key1", "value1");
    cache.set("key2", "value2");

    expect(cache.delete("key1")).toBe(true);
    expect(cache.get("key1")).toBeNull();
    expect(cache.get("key2")).toBe("value2");
  });

  it("should store objects", () => {
    const cache = new MemoryCache();
    const obj = { nested: { value: 42 } };
    cache.set("obj", obj);
    expect(cache.get("obj")).toEqual(obj);
  });

  it("should report correct size", () => {
    const cache = new MemoryCache();
    expect(cache.size).toBe(0);
    cache.set("a", 1);
    expect(cache.size).toBe(1);
    cache.set("b", 2);
    expect(cache.size).toBe(2);
  });
});

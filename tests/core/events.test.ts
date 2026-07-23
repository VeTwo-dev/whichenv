import { describe, it, expect } from "vitest";
import { EventEmitter } from "../../src/events.js";

interface TestEvents {
  "test:event": { value: string };
  "test:count": { count: number };
  [key: string]: unknown;
}

describe("EventEmitter", () => {
  it("should emit and listen to events", async () => {
    const emitter = new EventEmitter<TestEvents>();
    let received: string | null = null;

    emitter.on("test:event", (data) => {
      received = data.value;
    });

    await emitter.emit("test:event", { value: "hello" });
    expect(received).toBe("hello");
  });

  it("should support multiple listeners", async () => {
    const emitter = new EventEmitter<TestEvents>();
    const calls: number[] = [];

    emitter.on("test:count", (data) => calls.push(data.count));
    emitter.on("test:count", (data) => calls.push(data.count * 2));

    await emitter.emit("test:count", { count: 5 });
    expect(calls).toEqual([5, 10]);
  });

  it("should support once listeners", async () => {
    const emitter = new EventEmitter<TestEvents>();
    let callCount = 0;

    emitter.once("test:event", () => { callCount++; });

    await emitter.emit("test:event", { value: "a" });
    await emitter.emit("test:event", { value: "b" });
    expect(callCount).toBe(1);
  });

  it("should support off to remove listeners", async () => {
    const emitter = new EventEmitter<TestEvents>();
    let called = false;

    const handler = () => { called = true; };
    emitter.on("test:event", handler);
    emitter.off("test:event", handler);

    await emitter.emit("test:event", { value: "hello" });
    expect(called).toBe(false);
  });

  it("should support removeAllListeners", async () => {
    const emitter = new EventEmitter<TestEvents>();
    let callCount = 0;

    emitter.on("test:event", () => { callCount++; });
    emitter.on("test:event", () => { callCount++; });
    emitter.removeAllListeners("test:event");

    await emitter.emit("test:event", { value: "hello" });
    expect(callCount).toBe(0);
  });

  it("should return unsubscribe function from on()", async () => {
    const emitter = new EventEmitter<TestEvents>();
    let called = false;

    const unsub = emitter.on("test:event", () => { called = true; });
    unsub();

    await emitter.emit("test:event", { value: "hello" });
    expect(called).toBe(false);
  });

  it("should report listener count", () => {
    const emitter = new EventEmitter<TestEvents>();
    expect(emitter.listenerCount("test:event")).toBe(0);

    const handler = () => {};
    emitter.on("test:event", handler);
    expect(emitter.listenerCount("test:event")).toBe(1);

    emitter.off("test:event", handler);
    expect(emitter.listenerCount("test:event")).toBe(0);
  });

  it("should list event names", () => {
    const emitter = new EventEmitter<TestEvents>();
    emitter.on("test:event", () => {});
    emitter.on("test:count", () => {});

    const names = emitter.eventNames();
    expect(names).toContain("test:event");
    expect(names).toContain("test:count");
  });
});

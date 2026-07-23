type EventCallback<T = unknown> = (data: T) => void | Promise<void>;

export class EventEmitter<Events extends Record<string, unknown> = Record<string, unknown>> {
  private listeners = new Map<string, Set<EventCallback>>();

  on<K extends keyof Events & string>(event: K, callback: EventCallback<Events[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);

    return () => {
      this.listeners.get(event)?.delete(callback as EventCallback);
    };
  }

  once<K extends keyof Events & string>(event: K, callback: EventCallback<Events[K]>): () => void {
    const wrapper: EventCallback<Events[K]> = (data) => {
      this.off(event, wrapper);
      return callback(data);
    };
    return this.on(event, wrapper);
  }

  off<K extends keyof Events & string>(event: K, callback: EventCallback<Events[K]>): void {
    this.listeners.get(event)?.delete(callback as EventCallback);
  }

  async emit<K extends keyof Events & string>(event: K, data: Events[K]): Promise<void> {
    const callbacks = this.listeners.get(event);
    if (!callbacks || callbacks.size === 0) return;

    const promises: Promise<void>[] = [];
    for (const callback of callbacks) {
      promises.push(Promise.resolve().then(() => (callback as EventCallback<Events[K]>)(data)));
    }
    await Promise.allSettled(promises);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  eventNames(): string[] {
    return [...this.listeners.keys()];
  }
}

import type { WhichenvEvents } from "./types/plugin.js";

export const globalEmitter = new EventEmitter<WhichenvEvents>();

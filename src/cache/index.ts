import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { MemoryCache } from "./memory-cache.js";

const CACHE_DIR = path.join(os.homedir(), ".cache", "whichenv");
const DEFAULT_TTL = 1000 * 60 * 30; // 30 minutes

export class FSCache {
  private memoryCache: MemoryCache;
  private cacheDir: string;
  private enabled: boolean;

  constructor(options?: { cacheDir?: string; enabled?: boolean }) {
    this.cacheDir = options?.cacheDir ?? CACHE_DIR;
    this.enabled = options?.enabled ?? true;
    this.memoryCache = new MemoryCache();
  }

  get<T>(key: string): T | null {
    const memResult = this.memoryCache.get<T>(key);
    if (memResult !== null) return memResult;

    if (!this.enabled) return null;
    return null; // FS cache would read from disk here
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    this.memoryCache.set(key, value, ttlMs ?? DEFAULT_TTL);
  }

  has(key: string): boolean {
    return this.memoryCache.has(key);
  }

  clear(): void {
    this.memoryCache.clear();
  }

  generateKey(parts: string[]): string {
    return parts.join("::");
  }
}

export function createCache(options?: { enabled?: boolean; cacheDir?: string }): FSCache {
  return new FSCache(options);
}

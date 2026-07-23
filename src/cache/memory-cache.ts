/**
 * Simple in-memory cache with optional TTL.
 */
export class MemoryCache {
  private store = new Map<string, { value: unknown; expiresAt: number | null }>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    this.store.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : null,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.store.clear();
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  get size(): number {
    return this.store.size;
  }
}

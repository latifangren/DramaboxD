// Cache TTL in-memory — perisai rate-limit untuk katalog upstream
// (ARCHITECTURE.md §5: Browse 15–30 mnt, episode 60 mnt, stale-while-revalidate).

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache {
  private readonly store = new Map<string, Entry<unknown>>();

  /** Ambil nilai segar; undefined bila tidak ada / kedaluwarsa. */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) return undefined;
    return entry.value as T;
  }

  /** Ambil nilai walau kedaluwarsa (untuk stale-while-revalidate). */
  getStale<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    return entry ? (entry.value as T) : undefined;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /**
   * Pola utama layanan: sajikan cache segar bila ada; bila basi, sajikan basi
   * sambil menyegarkan di latar; bila kosong, tunggu fetch.
   */
  async getOrFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const fresh = this.get<T>(key);
    if (fresh !== undefined) return fresh;
    const stale = this.getStale<T>(key);
    if (stale !== undefined) {
      void fetcher()
        .then((value) => this.set(key, value, ttlMs))
        .catch(() => undefined);
      return stale;
    }
    const value = await fetcher();
    this.set(key, value, ttlMs);
    return value;
  }

  clear(): void {
    this.store.clear();
  }
}

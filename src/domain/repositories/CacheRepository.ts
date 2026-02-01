/**
 * Repository interface for caching evaluation results
 */
export interface CacheRepository<T> {
  /**
   * Get a cached value by key
   */
  get(key: string): Promise<T | null>;

  /**
   * Store a value in cache with optional TTL
   */
  set(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Remove a value from cache
   */
  delete(key: string): Promise<void>;

  /**
   * Clear all cached values
   */
  clear(): Promise<void>;

  /**
   * Check if a key exists in cache
   */
  has(key: string): Promise<boolean>;
}

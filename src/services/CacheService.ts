/**
 * Cache entry with timestamp and TTL
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

/**
 * Generic caching service with TTL support
 */
export class CacheService<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly defaultTTL: number = 300000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(defaultTTL?: number, enableAutoCleanup: boolean = true) {
    if (defaultTTL) {
      this.defaultTTL = defaultTTL;
    }
    
    if (enableAutoCleanup) {
      // Run cleanup every minute
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }
  }
  
  /**
   * Get a value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }
  
  /**
   * Set a value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };
    
    this.cache.set(key, entry);
  }
  
  /**
   * Check if a key exists in cache (and is not expired)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }
  
  /**
   * Get or set with factory function
   */
  async getOrSet(key: string, factory: () => T | Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
  
  /**
   * Check if a cache entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }
  
  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let removed = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    return removed;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.entries());
    const now = Date.now();
    
    const validEntries = entries.filter(([_, entry]) => !this.isExpired(entry));
    const expiredEntries = entries.length - validEntries.length;
    
    const avgAge = validEntries.length > 0
      ? validEntries.reduce((sum, [_, entry]) => sum + (now - entry.timestamp), 0) / validEntries.length
      : 0;
    
    return {
      size: this.cache.size,
      validEntries: validEntries.length,
      expiredEntries,
      avgAge: Math.round(avgAge),
      memoryUsage: this.estimateMemoryUsage()
    };
  }
  
  /**
   * Estimate memory usage (rough approximation)
   */
  private estimateMemoryUsage(): number {
    let bytes = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation
      bytes += key.length * 2; // Unicode characters
      bytes += JSON.stringify(entry.value).length * 2;
      bytes += 24; // Overhead for timestamp, ttl, and object structure
    }
    
    return bytes;
  }
  
  /**
   * Destroy the cache service
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number;
  validEntries: number;
  expiredEntries: number;
  avgAge: number;
  memoryUsage: number;
}

/**
 * Analysis result cache service
 */
export class AnalysisCache extends CacheService<AnalysisResult> {
  constructor() {
    super(600000); // 10 minute TTL for analysis results
  }
  
  /**
   * Generate cache key for analysis
   */
  generateKey(content: string, context?: string): string {
    // Create a simple hash of the content
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `analysis:${hash}:${context || 'default'}`;
  }
}

/**
 * Analysis result interface
 */
interface AnalysisResult {
  toneScore?: number;
  voiceScore?: number;
  terminologyScore?: number;
  complianceScore?: number;
  timestamp: number;
}
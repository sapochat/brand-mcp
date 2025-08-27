/**
 * Simple dependency injection container for managing service instances
 */
export class Container {
  private services = new Map<string, any>();
  private singletons = new Map<string, any>();
  private factories = new Map<string, () => any>();

  /**
   * Register a singleton service
   */
  registerSingleton<T>(key: string, instance: T): void {
    this.singletons.set(key, instance);
  }

  /**
   * Register a factory function for creating service instances
   */
  registerFactory<T>(key: string, factory: () => T): void {
    this.factories.set(key, factory);
  }

  /**
   * Register a transient service (new instance each time)
   */
  registerTransient<T>(key: string, instance: T): void {
    this.services.set(key, instance);
  }

  /**
   * Resolve a service by key
   */
  resolve<T>(key: string): T {
    // Check singletons first
    if (this.singletons.has(key)) {
      return this.singletons.get(key);
    }

    // Check if we have a factory
    if (this.factories.has(key)) {
      const factory = this.factories.get(key);
      if (factory) {
        const instance = factory();
        
        // Store as singleton for future requests
        this.singletons.set(key, instance);
        return instance;
      }
    }

    // Check transient services
    if (this.services.has(key)) {
      return this.services.get(key);
    }

    throw new Error(`Service '${key}' not found in container`);
  }

  /**
   * Check if a service is registered
   */
  has(key: string): boolean {
    return this.singletons.has(key) || 
           this.factories.has(key) || 
           this.services.has(key);
  }

  /**
   * Clear all registered services
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
    this.factories.clear();
  }

  /**
   * Get all registered service keys
   */
  getRegisteredKeys(): string[] {
    const keys = new Set<string>();
    
    this.singletons.forEach((_, key) => keys.add(key));
    this.factories.forEach((_, key) => keys.add(key));
    this.services.forEach((_, key) => keys.add(key));
    
    return Array.from(keys);
  }
}

/**
 * Service registration keys
 */
export const ServiceKeys = {
  // Domain Services
  SAFETY_EVALUATION_SERVICE: 'SafetyEvaluationService',
  BRAND_COMPLIANCE_SERVICE: 'BrandComplianceService',
  
  // Repositories
  BRAND_SCHEMA_REPOSITORY: 'BrandSchemaRepository',
  CACHE_REPOSITORY: 'CacheRepository',
  
  // Use Cases
  CHECK_SAFETY_USE_CASE: 'CheckSafetyUseCase',
  CHECK_COMPLIANCE_USE_CASE: 'CheckComplianceUseCase',
  COMBINED_EVALUATION_USE_CASE: 'CombinedEvaluationUseCase',
  UPDATE_CONFIG_USE_CASE: 'UpdateConfigUseCase',
  BATCH_EVALUATION_USE_CASE: 'BatchEvaluationUseCase',
  
  // Formatters
  SAFETY_RESPONSE_FORMATTER: 'SafetyResponseFormatter',
  COMPLIANCE_RESPONSE_FORMATTER: 'ComplianceResponseFormatter',
  COMBINED_RESPONSE_FORMATTER: 'CombinedResponseFormatter',
  BATCH_RESPONSE_FORMATTER: 'BatchResponseFormatter',
  
  // Validators
  MCP_REQUEST_VALIDATOR: 'McpRequestValidator',
  
  // Adapters
  MCP_SERVER_ADAPTER: 'McpServerAdapter',
  
  // Advanced Services
  MULTI_LANGUAGE_ANALYZER: 'MultiLanguageAnalyzer',
  CONFIDENCE_SCORER: 'ConfidenceScorer',
  EVALUATION_EXPLAINER: 'EvaluationExplainer',
  RECOMMENDATION_ENGINE: 'RecommendationEngine'
} as const;
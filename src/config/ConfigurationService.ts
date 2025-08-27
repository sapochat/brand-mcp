import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BrandSchema } from '../types/brandSchema.js';
import { BrandSafetyConfig, RiskLevel } from '../types/brandSafety.js';
import { validatePath, SafeError } from '../utils/security.js';

/**
 * Application configuration interface
 */
export interface AppConfig {
  brand: {
    schema?: BrandSchema;
    schemaPath?: string;
    autoReload?: boolean;
  };
  safety: BrandSafetyConfig;
  performance: {
    cacheTTL: number;
    maxCacheSize: number;
    enableCaching: boolean;
  };
  security: {
    maxContentLength: number;
    rateLimit: {
      maxRequests: number;
      windowMs: number;
    };
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    destination: 'console' | 'file';
    filePath?: string;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AppConfig = {
  brand: {
    autoReload: false
  },
  safety: {
    categories: [],
    sensitiveKeywords: [],
    allowedTopics: [],
    blockedTopics: [],
    riskTolerances: {
      SEXUAL_CONTENT: RiskLevel.LOW,
      VIOLENCE: RiskLevel.LOW,
      HATE_SPEECH: RiskLevel.NONE,
      HARASSMENT: RiskLevel.NONE,
      SELF_HARM: RiskLevel.NONE,
      ILLEGAL_ACTIVITIES: RiskLevel.NONE,
      PROFANITY: RiskLevel.MEDIUM,
      ALCOHOL_TOBACCO: RiskLevel.MEDIUM,
      POLITICAL: RiskLevel.MEDIUM,
      RELIGION: RiskLevel.MEDIUM,
      SENTIMENT_ANALYSIS: RiskLevel.MEDIUM,
      CONTEXTUAL_ANALYSIS: RiskLevel.MEDIUM
    }
  },
  performance: {
    cacheTTL: 600000, // 10 minutes
    maxCacheSize: 100,
    enableCaching: true
  },
  security: {
    maxContentLength: 100000,
    rateLimit: {
      maxRequests: 100,
      windowMs: 60000
    }
  },
  logging: {
    level: 'info',
    format: 'json',
    destination: 'console'
  }
};

/**
 * Configuration service for managing application settings
 */
export class ConfigurationService {
  private static instance: ConfigurationService | null = null;
  private config: AppConfig;
  private configPath: string;
  private brandSchema: BrandSchema | null = null;
  private fileWatcher: fs.FSWatcher | null = null;
  
  private constructor(configPath?: string) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    this.configPath = configPath || path.resolve(__dirname, '../../config.json');
    this.config = { ...DEFAULT_CONFIG };
    this.loadConfiguration();
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(configPath?: string): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService(configPath);
    }
    return ConfigurationService.instance;
  }
  
  /**
   * Load configuration from file
   */
  private loadConfiguration(): void {
    try {
      // Validate path security
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const projectRoot = path.resolve(__dirname, '../..');
      
      if (!validatePath(this.configPath, projectRoot)) {
        throw new SafeError(
          'Configuration path is outside project directory',
          'CONFIG_PATH_INVALID'
        );
      }
      
      // Check if config file exists
      if (fs.existsSync(this.configPath)) {
        const configContent = fs.readFileSync(this.configPath, 'utf-8');
        const loadedConfig = JSON.parse(configContent) as Partial<AppConfig>;
        
        // Deep merge with defaults
        this.config = this.deepMerge(DEFAULT_CONFIG, loadedConfig) as AppConfig;
      } else {
        // Create default config file
        this.saveConfiguration();
      }
      
      // Set up file watching if enabled
      if (this.config.brand.autoReload) {
        this.setupFileWatcher();
      }
    } catch (error) {
      if (error instanceof SafeError) {
        throw error;
      }
      throw new SafeError(
        'Failed to load configuration',
        'CONFIG_LOAD_ERROR',
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  
  /**
   * Save configuration to file
   */
  saveConfiguration(): void {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true, mode: 0o750 });
      }
      
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        { mode: 0o600 }
      );
    } catch (error) {
      throw new SafeError(
        'Failed to save configuration',
        'CONFIG_SAVE_ERROR',
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  
  /**
   * Get full configuration
   */
  getConfig(): AppConfig {
    return { ...this.config };
  }
  
  /**
   * Get brand configuration
   */
  getBrandConfig(): AppConfig['brand'] {
    return { ...this.config.brand };
  }
  
  /**
   * Get safety configuration
   */
  getSafetyConfig(): BrandSafetyConfig {
    return { ...this.config.safety };
  }
  
  /**
   * Get performance configuration
   */
  getPerformanceConfig(): AppConfig['performance'] {
    return { ...this.config.performance };
  }
  
  /**
   * Get security configuration
   */
  getSecurityConfig(): AppConfig['security'] {
    return { ...this.config.security };
  }
  
  /**
   * Get logging configuration
   */
  getLoggingConfig(): AppConfig['logging'] {
    return { ...this.config.logging };
  }
  
  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AppConfig>): void {
    this.config = this.deepMerge(this.config, updates) as AppConfig;
    this.saveConfiguration();
  }
  
  /**
   * Update brand configuration
   */
  updateBrandConfig(updates: Partial<AppConfig['brand']>): void {
    this.config.brand = { ...this.config.brand, ...updates };
    this.saveConfiguration();
  }
  
  /**
   * Update safety configuration
   */
  updateSafetyConfig(updates: Partial<BrandSafetyConfig>): void {
    this.config.safety = { ...this.config.safety, ...updates };
    this.saveConfiguration();
  }
  
  /**
   * Get brand schema
   */
  getBrandSchema(): BrandSchema | null {
    return this.brandSchema;
  }
  
  /**
   * Set brand schema
   */
  setBrandSchema(schema: BrandSchema): void {
    this.brandSchema = schema;
  }
  
  /**
   * Load brand schema from configured path
   */
  async loadBrandSchema(): Promise<BrandSchema | null> {
    if (!this.config.brand.schemaPath) {
      return null;
    }
    
    try {
      const { loadBrandSchema } = await import('../utils/brandSchemaLoader.js');
      this.brandSchema = await loadBrandSchema();
      return this.brandSchema;
    } catch (error) {
      throw new SafeError(
        'Failed to load brand schema',
        'BRAND_SCHEMA_LOAD_ERROR',
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  
  /**
   * Set up file watcher for configuration changes
   */
  private setupFileWatcher(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
    }
    
    this.fileWatcher = fs.watch(this.configPath, (eventType) => {
      if (eventType === 'change') {
        this.loadConfiguration();
        this.onConfigurationChange();
      }
    });
  }
  
  /**
   * Handle configuration changes
   */
  private onConfigurationChange(): void {
    // Emit event or notify services about config change
    // This could be implemented with EventEmitter
    if (process.env.NODE_ENV !== 'production') {
      console.log('Configuration reloaded');
    }
  }
  
  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] instanceof Object && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
  
  /**
   * Reset to default configuration
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.saveConfiguration();
  }
  
  /**
   * Destroy the configuration service
   */
  destroy(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
    ConfigurationService.instance = null;
  }
}

/**
 * Export singleton getter
 */
export function getConfig(): ConfigurationService {
  return ConfigurationService.getInstance();
}
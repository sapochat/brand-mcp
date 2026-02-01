/**
 * Base plugin interface for extending brand safety evaluation capabilities
 */
export interface Plugin {
  /**
   * Unique identifier for the plugin
   */
  readonly id: string;

  /**
   * Display name of the plugin
   */
  readonly name: string;

  /**
   * Plugin version following semantic versioning
   */
  readonly version: string;

  /**
   * Short description of what the plugin does
   */
  readonly description: string;

  /**
   * Plugin lifecycle hook - called when plugin is loaded
   */
  onLoad?(): Promise<void>;

  /**
   * Plugin lifecycle hook - called when plugin is being unloaded
   */
  onUnload?(): Promise<void>;

  /**
   * Check if plugin is compatible with current system version
   */
  isCompatible(systemVersion: string): boolean;
}

/**
 * Plugin that provides custom evaluation rules
 */
export interface EvaluationPlugin extends Plugin {
  /**
   * Type of evaluation this plugin provides
   */
  readonly evaluationType: 'safety' | 'compliance' | 'custom';

  /**
   * Evaluate content using custom rules
   */
  evaluate(content: string, context?: PluginContext): Promise<PluginEvaluationResult>;

  /**
   * Get plugin-specific configuration schema
   */
  getConfigSchema?(): PluginConfigSchema;
}

/**
 * Plugin that enriches content before evaluation
 */
export interface ContentEnricherPlugin extends Plugin {
  /**
   * Priority for running enricher (higher runs first)
   */
  readonly priority: number;

  /**
   * Enrich content before evaluation
   */
  enrich(content: string, metadata?: Record<string, unknown>): Promise<EnrichedContent>;
}

/**
 * Plugin that formats evaluation results
 */
export interface FormatterPlugin extends Plugin {
  /**
   * Supported output formats
   */
  readonly supportedFormats: string[];

  /**
   * Format evaluation result
   */
  format(result: unknown, format: string): Promise<string>;
}

/**
 * Context provided to plugins during execution
 */
export interface PluginContext {
  /**
   * Current brand configuration
   */
  brandConfig?: Record<string, unknown>;

  /**
   * User-provided context
   */
  userContext?: string;

  /**
   * System metadata
   */
  systemMetadata: {
    timestamp: Date;
    requestId: string;
    clientId?: string;
  };
}

/**
 * Result from plugin evaluation
 */
export interface PluginEvaluationResult {
  /**
   * Plugin that generated this result
   */
  pluginId: string;

  /**
   * Overall score (0-100)
   */
  score: number;

  /**
   * Is content compliant according to plugin rules
   */
  isCompliant: boolean;

  /**
   * Risk level assessment
   */
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

  /**
   * Detected issues
   */
  issues: PluginIssue[];

  /**
   * Plugin-specific metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Issue detected by plugin
 */
export interface PluginIssue {
  /**
   * Issue type/category
   */
  type: string;

  /**
   * Severity of the issue
   */
  severity: 'info' | 'warning' | 'error' | 'critical';

  /**
   * Human-readable description
   */
  description: string;

  /**
   * Position in content where issue was found
   */
  position?: {
    start: number;
    end: number;
  };

  /**
   * Suggested fix for the issue
   */
  suggestion?: string;
}

/**
 * Enriched content with additional metadata
 */
export interface EnrichedContent {
  /**
   * Original content
   */
  original: string;

  /**
   * Enriched/processed content
   */
  enriched: string;

  /**
   * Additional metadata added by enricher
   */
  metadata: Record<string, unknown>;
}

/**
 * JSON Schema type definition
 */
export interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  const?: unknown;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
  additionalProperties?: boolean | JsonSchema;
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
}

/**
 * UI Schema for rendering configuration forms
 */
export interface UiSchema {
  'ui:widget'?: string;
  'ui:options'?: Record<string, unknown>;
  'ui:order'?: string[];
  'ui:placeholder'?: string;
  'ui:disabled'?: boolean;
  'ui:readonly'?: boolean;
  [key: string]: UiSchema | string | boolean | string[] | Record<string, unknown> | undefined;
}

/**
 * Plugin configuration schema definition
 */
export interface PluginConfigSchema {
  /**
   * JSON Schema for configuration validation
   */
  schema: JsonSchema;

  /**
   * Default configuration values
   */
  defaults?: Record<string, unknown>;

  /**
   * UI hints for configuration
   */
  uiSchema?: UiSchema;
}

/**
 * Plugin manifest for discovery and loading
 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  main: string; // Entry point file
  type: 'evaluation' | 'enricher' | 'formatter';
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  config?: PluginConfigSchema;
}

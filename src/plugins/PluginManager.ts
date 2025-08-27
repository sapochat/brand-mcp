import { 
  Plugin, 
  EvaluationPlugin, 
  ContentEnricherPlugin, 
  FormatterPlugin,
  PluginManifest,
  PluginContext,
  PluginEvaluationResult
} from './interfaces/Plugin.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Manages plugin lifecycle and orchestration
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private evaluationPlugins: Map<string, EvaluationPlugin> = new Map();
  private enricherPlugins: ContentEnricherPlugin[] = [];
  private formatterPlugins: Map<string, FormatterPlugin> = new Map();
  private pluginConfigs: Map<string, any> = new Map();

  constructor(
    private readonly pluginsDirectory: string = './plugins',
    private readonly systemVersion: string = '1.0.0'
  ) {}

  /**
   * Initialize plugin manager and load all plugins
   */
  async initialize(): Promise<void> {
    await this.loadPlugins();
  }

  /**
   * Load all plugins from the plugins directory
   */
  private async loadPlugins(): Promise<void> {
    try {
      const pluginDirs = await this.discoverPlugins();
      
      for (const pluginDir of pluginDirs) {
        try {
          await this.loadPlugin(pluginDir);
        } catch (error) {
          console.error(`Failed to load plugin from ${pluginDir}:`, error);
        }
      }

      // Sort enricher plugins by priority
      this.enricherPlugins.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    }
  }

  /**
   * Discover available plugins in the plugins directory
   */
  private async discoverPlugins(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.pluginsDirectory, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(this.pluginsDirectory, entry.name));
    } catch (error) {
      console.error('Failed to discover plugins:', error);
      return [];
    }
  }

  /**
   * Load a single plugin from directory
   */
  private async loadPlugin(pluginPath: string): Promise<void> {
    // Read manifest
    const manifestPath = path.join(pluginPath, 'manifest.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest: PluginManifest = JSON.parse(manifestContent);

    // Dynamic import of plugin module
    const modulePath = path.join(pluginPath, manifest.main);
    const pluginModule = await import(modulePath);
    
    // Get the default export or the first exported class
    const PluginClass = pluginModule.default || Object.values(pluginModule)[0];
    
    if (!PluginClass) {
      throw new Error(`No plugin class found in ${modulePath}`);
    }

    // Instantiate plugin
    const plugin: Plugin = new PluginClass();

    // Validate plugin compatibility
    if (!plugin.isCompatible(this.systemVersion)) {
      throw new Error(`Plugin ${plugin.id} is not compatible with system version ${this.systemVersion}`);
    }

    // Register plugin by type
    this.plugins.set(plugin.id, plugin);

    if (this.isEvaluationPlugin(plugin)) {
      this.evaluationPlugins.set(plugin.id, plugin as EvaluationPlugin);
    }

    if (this.isEnricherPlugin(plugin)) {
      this.enricherPlugins.push(plugin as ContentEnricherPlugin);
    }

    if (this.isFormatterPlugin(plugin)) {
      this.formatterPlugins.set(plugin.id, plugin as FormatterPlugin);
    }

    // Load plugin configuration
    if (manifest.config?.defaults) {
      this.pluginConfigs.set(plugin.id, manifest.config.defaults);
    }

    // Call onLoad hook
    if (plugin.onLoad) {
      await plugin.onLoad();
    }

    console.log(`Loaded plugin: ${plugin.name} (${plugin.id}) v${plugin.version}`);
  }

  /**
   * Type guards for plugin types
   */
  private isEvaluationPlugin(plugin: Plugin): plugin is EvaluationPlugin {
    return 'evaluate' in plugin && typeof (plugin as any).evaluate === 'function';
  }

  private isEnricherPlugin(plugin: Plugin): plugin is ContentEnricherPlugin {
    return 'enrich' in plugin && typeof (plugin as any).enrich === 'function';
  }

  private isFormatterPlugin(plugin: Plugin): plugin is FormatterPlugin {
    return 'format' in plugin && typeof (plugin as any).format === 'function';
  }

  /**
   * Run all enricher plugins on content
   */
  async enrichContent(content: string, metadata?: any): Promise<string> {
    let enrichedContent = content;
    let accumulatedMetadata = { ...metadata };

    for (const enricher of this.enricherPlugins) {
      try {
        const result = await enricher.enrich(enrichedContent, accumulatedMetadata);
        enrichedContent = result.enriched;
        accumulatedMetadata = { ...accumulatedMetadata, ...result.metadata };
      } catch (error) {
        console.error(`Enricher plugin ${enricher.id} failed:`, error);
      }
    }

    return enrichedContent;
  }

  /**
   * Run evaluation plugins
   */
  async runEvaluations(
    content: string, 
    context?: PluginContext,
    pluginIds?: string[]
  ): Promise<PluginEvaluationResult[]> {
    const results: PluginEvaluationResult[] = [];
    const pluginsToRun = pluginIds 
      ? Array.from(this.evaluationPlugins.values()).filter(p => pluginIds.includes(p.id))
      : Array.from(this.evaluationPlugins.values());

    for (const plugin of pluginsToRun) {
      try {
        const result = await plugin.evaluate(content, context);
        results.push(result);
      } catch (error) {
        console.error(`Evaluation plugin ${plugin.id} failed:`, error);
      }
    }

    return results;
  }

  /**
   * Format result using formatter plugin
   */
  async formatResult(result: any, format: string, pluginId?: string): Promise<string> {
    const formatter = pluginId 
      ? this.formatterPlugins.get(pluginId)
      : Array.from(this.formatterPlugins.values()).find(f => f.supportedFormats.includes(format));

    if (!formatter) {
      throw new Error(`No formatter plugin found for format: ${format}`);
    }

    return formatter.format(result, format);
  }

  /**
   * Get all loaded plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin by ID
   */
  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Update plugin configuration
   */
  updatePluginConfig(pluginId: string, config: any): void {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    this.pluginConfigs.set(pluginId, config);
  }

  /**
   * Get plugin configuration
   */
  getPluginConfig(pluginId: string): any {
    return this.pluginConfigs.get(pluginId);
  }

  /**
   * Unload all plugins
   */
  async shutdown(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.onUnload) {
        try {
          await plugin.onUnload();
        } catch (error) {
          console.error(`Failed to unload plugin ${plugin.id}:`, error);
        }
      }
    }

    this.plugins.clear();
    this.evaluationPlugins.clear();
    this.enricherPlugins = [];
    this.formatterPlugins.clear();
    this.pluginConfigs.clear();
  }

  /**
   * Reload a specific plugin
   */
  async reloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Unload the plugin
    if (plugin.onUnload) {
      await plugin.onUnload();
    }

    // Remove from registries
    this.plugins.delete(pluginId);
    this.evaluationPlugins.delete(pluginId);
    this.enricherPlugins = this.enricherPlugins.filter(p => p.id !== pluginId);
    this.formatterPlugins.delete(pluginId);
    this.pluginConfigs.delete(pluginId);

    // Reload from disk
    const pluginPath = path.join(this.pluginsDirectory, pluginId);
    await this.loadPlugin(pluginPath);
  }

  /**
   * Get plugin statistics
   */
  getStats(): PluginManagerStats {
    return {
      totalPlugins: this.plugins.size,
      evaluationPlugins: this.evaluationPlugins.size,
      enricherPlugins: this.enricherPlugins.length,
      formatterPlugins: this.formatterPlugins.size,
      pluginList: Array.from(this.plugins.values()).map(p => ({
        id: p.id,
        name: p.name,
        version: p.version,
        type: this.getPluginType(p)
      }))
    };
  }

  private getPluginType(plugin: Plugin): string {
    if (this.isEvaluationPlugin(plugin)) return 'evaluation';
    if (this.isEnricherPlugin(plugin)) return 'enricher';
    if (this.isFormatterPlugin(plugin)) return 'formatter';
    return 'unknown';
  }
}

interface PluginManagerStats {
  totalPlugins: number;
  evaluationPlugins: number;
  enricherPlugins: number;
  formatterPlugins: number;
  pluginList: Array<{
    id: string;
    name: string;
    version: string;
    type: string;
  }>;
}
import { BrandSchemaRepository } from '../../../domain/repositories/BrandSchemaRepository.js';
import { BrandSchema } from '../../../domain/entities/Brand.js';
import { loadBrandSchema } from '../../../utils/brandSchemaLoader.js';

/**
 * File-based implementation of brand schema repository with runtime override support.
 *
 * Loads brand schema from file on first access, but allows runtime updates
 * that persist in memory for the session. This supports the update-config
 * MCP tool without requiring file write permissions.
 */
export class FileBrandSchemaRepository implements BrandSchemaRepository {
  private cachedSchema: BrandSchema | null = null;
  private runtimeOverrides: Partial<BrandSchema> | null = null;

  async loadBrandSchema(): Promise<BrandSchema> {
    try {
      // Load from file if not cached
      if (!this.cachedSchema) {
        this.cachedSchema = await loadBrandSchema();
      }

      // Apply any runtime overrides
      if (this.runtimeOverrides) {
        return this.mergeSchemas(this.cachedSchema, this.runtimeOverrides);
      }

      return this.cachedSchema;
    } catch (error) {
      throw new Error(
        `Failed to load brand schema: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async updateBrandSchema(schema: BrandSchema): Promise<void> {
    // Store as runtime override - persists for session duration
    this.runtimeOverrides = schema;

    // Also update the cached base schema for complete replacements
    if (this.isCompleteSchema(schema)) {
      this.cachedSchema = schema;
      this.runtimeOverrides = null;
    }
  }

  async exists(): Promise<boolean> {
    try {
      await this.loadBrandSchema();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear runtime overrides and reload from file
   */
  async reload(): Promise<void> {
    this.cachedSchema = null;
    this.runtimeOverrides = null;
    await this.loadBrandSchema();
  }

  /**
   * Check if schema has all required fields for a complete replacement
   */
  private isCompleteSchema(schema: Partial<BrandSchema>): schema is BrandSchema {
    return !!(schema.name && schema.toneGuidelines && schema.voiceGuidelines);
  }

  /**
   * Deep merge base schema with overrides
   */
  private mergeSchemas(base: BrandSchema, overrides: Partial<BrandSchema>): BrandSchema {
    return {
      ...base,
      ...overrides,
      toneGuidelines: overrides.toneGuidelines
        ? { ...base.toneGuidelines, ...overrides.toneGuidelines }
        : base.toneGuidelines,
      voiceGuidelines: overrides.voiceGuidelines
        ? { ...base.voiceGuidelines, ...overrides.voiceGuidelines }
        : base.voiceGuidelines,
      visualIdentity: overrides.visualIdentity
        ? { ...base.visualIdentity, ...overrides.visualIdentity }
        : base.visualIdentity,
      terminologyGuidelines: overrides.terminologyGuidelines
        ? { ...base.terminologyGuidelines, ...overrides.terminologyGuidelines }
        : base.terminologyGuidelines,
    };
  }
}

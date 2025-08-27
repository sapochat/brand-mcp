import { BrandSchemaRepository } from '../../../domain/repositories/BrandSchemaRepository.js';
import { BrandSchema } from '../../../domain/entities/Brand.js';
import { loadBrandSchema } from '../../../utils/brandSchemaLoader.js';

/**
 * File-based implementation of brand schema repository
 */
export class FileBrandSchemaRepository implements BrandSchemaRepository {
  
  async loadBrandSchema(): Promise<BrandSchema> {
    try {
      return await loadBrandSchema();
    } catch (error) {
      throw new Error(`Failed to load brand schema: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateBrandSchema(_schema: BrandSchema): Promise<void> {
    throw new Error('Brand schema update not implemented for file-based repository');
  }

  async exists(): Promise<boolean> {
    try {
      await this.loadBrandSchema();
      return true;
    } catch {
      return false;
    }
  }
}
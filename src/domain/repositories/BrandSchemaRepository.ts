import { BrandSchema } from '../entities/Brand.js';

/**
 * Repository interface for loading and managing brand schemas
 */
export interface BrandSchemaRepository {
  /**
   * Load the active brand schema
   */
  loadBrandSchema(): Promise<BrandSchema>;

  /**
   * Update the brand schema
   */
  updateBrandSchema(schema: BrandSchema): Promise<void>;

  /**
   * Check if a brand schema exists
   */
  exists(): Promise<boolean>;
}

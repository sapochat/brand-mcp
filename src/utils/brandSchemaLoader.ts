import path from 'path';
import { fileURLToPath } from 'url';
import { BrandSchema } from '../types/brandSchema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Loads the brand schema from the brandSchema.js file
 */
export async function loadBrandSchema(): Promise<BrandSchema> {
  try {
    // Load from project root
    const schemaPath = path.resolve(__dirname, '../../brandSchema.js');
    const module = await import(schemaPath);
    const schema = module.default || module.brandSchema;
    
    // Ensure gridSystem is always defined
    if (schema?.visualIdentity?.layout && !schema.visualIdentity.layout.gridSystem) {
      schema.visualIdentity.layout.gridSystem = '12-column';
    }
    
    return schema;
  } catch (error) {
    throw new Error(`Failed to load brand schema: ${error instanceof Error ? error.message : String(error)}`);
  }
}
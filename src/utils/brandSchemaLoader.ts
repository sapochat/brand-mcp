import { promises as fs } from 'fs';
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
    return module.default || module.brandSchema;
  } catch (error) {
    throw new Error(`Failed to load brand schema: ${error instanceof Error ? error.message : String(error)}`);
  }
}
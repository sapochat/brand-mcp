import path from 'path';
import { fileURLToPath } from 'url';
import { BrandSchema } from '../types/brandSchema.js';

/**
 * Load brand schema from brandSchema.js file
 * Uses dynamic import for secure loading without eval()
 */
export async function loadBrandSchema(filePath?: string): Promise<BrandSchema> {
  try {
    // Default path is relative to the current module
    if (!filePath) {
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      filePath = path.resolve(__dirname, '../../brandSchema.js');
    }
    
    // Validate path to prevent traversal attacks
    const normalizedPath = path.normalize(filePath);
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(__dirname, '../..');
    
    if (!normalizedPath.startsWith(projectRoot)) {
      throw new Error('Invalid file path: Access denied outside project directory');
    }
    
    // Use dynamic import to safely load the module
    try {
      // Convert to file URL for dynamic import
      const fileUrl = new URL(`file://${normalizedPath}`).href;
      const module = await import(fileUrl);
      
      if (!module.activeBrandProfile) {
        throw new Error('activeBrandProfile not found in the loaded module');
      }
      
      return module.activeBrandProfile as BrandSchema;
    } catch (importError) {
      // Fallback: Try importing from relative path
      const relativePath = `../../brandSchema.js`;
      const module = await import(relativePath);
      
      if (!module.activeBrandProfile) {
        throw new Error('activeBrandProfile not found in the loaded module');
      }
      
      return module.activeBrandProfile as BrandSchema;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error loading brand schema';
    throw new Error(`Failed to load brand schema: ${errorMessage}`);
  }
} 
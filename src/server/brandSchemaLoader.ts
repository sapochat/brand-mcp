import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BrandSchema } from '../types/brandSchema.js';

/**
 * Load brand schema from brandSchema.js file
 */
export async function loadBrandSchema(filePath?: string): Promise<BrandSchema> {
  try {
    // Default path is relative to the current module
    if (!filePath) {
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      filePath = path.resolve(__dirname, '../../brandSchema.js');
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Brand schema file not found at ${filePath}`);
    }
    
    // Read file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract exampleBrand data using a regex pattern
    // Note: In a real implementation, you would import the module properly
    // This is a simplified approach for demonstration purposes
    const exampleBrandMatch = fileContent.match(/const exampleBrand = ({[\s\S]*?});/);
    
    if (!exampleBrandMatch || !exampleBrandMatch[1]) {
      throw new Error('Could not extract exampleBrand from the file');
    }
    
    // Parse the extracted JSON
    // Note: This is not a safe approach for production, but works for demonstration
    const brandObject = eval(`(${exampleBrandMatch[1]})`);
    
    return brandObject as BrandSchema;
  } catch (error) {
    console.error('Error loading brand schema:', error);
    throw error;
  }
} 
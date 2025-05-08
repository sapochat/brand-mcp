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
    console.log(`[DEBUG] brandSchemaLoader: Reading from filePath: ${filePath}`); // Added log
    
    // Extract activeBrandProfile data using a regex pattern
    // The module is extracted using regex for demonstration purposes.
    // A direct import would be used in a production environment.
    const activeBrandProfileMatch = fileContent.match(/const activeBrandProfile = ({[\s\S]*?});/);
    console.log('[DEBUG] brandSchemaLoader: activeBrandProfileMatch:', activeBrandProfileMatch ? activeBrandProfileMatch[0].substring(0, 100) + '...' : null); // Added log
    
    if (!activeBrandProfileMatch || !activeBrandProfileMatch[1]) {
      throw new Error('Could not extract activeBrandProfile from the file');
    }
    
    // Parse the extracted JSON
    // The extracted string is evaluated for demonstration purposes.
    // A safer parsing method would be used in a production environment.
    const brandObject = eval(`(${activeBrandProfileMatch[1]})`);
    
    return brandObject as BrandSchema;
  } catch (error) {
    console.error('Error loading brand schema:', error);
    throw error;
  }
} 
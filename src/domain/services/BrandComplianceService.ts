import { Content } from '../entities/Content.js';
import { Brand } from '../entities/Brand.js';
import { ComplianceEvaluation } from '../entities/ComplianceEvaluation.js';

/**
 * Domain service interface for brand compliance evaluation
 */
export interface BrandComplianceService {
  /**
   * Check if content complies with brand guidelines
   */
  checkCompliance(content: Content, brand: Brand, context?: string): ComplianceEvaluation;

  /**
   * Set the active brand for compliance checking
   */
  setBrand(brand: Brand): void;

  /**
   * Get the currently active brand
   */
  getBrand(): Brand | null;
}

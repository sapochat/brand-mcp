import { Content } from '../entities/Content.js';
import { SafetyEvaluation } from '../entities/SafetyEvaluation.js';

/**
 * Domain service interface for content safety evaluation
 */
export interface SafetyEvaluationService {
  /**
   * Evaluate content for safety risks across all categories
   */
  evaluateContent(content: Content): Promise<SafetyEvaluation>;

  /**
   * Update safety evaluation configuration
   */
  updateConfig(config: Partial<SafetyConfig>): void;
}

/**
 * Safety configuration for evaluation service
 */
export interface SafetyConfig {
  readonly sensitiveKeywords: readonly string[];
  readonly allowedTopics: readonly string[];
  readonly blockedTopics: readonly string[];
  readonly riskTolerances: Record<string, string>;
  readonly categories: readonly string[];
}

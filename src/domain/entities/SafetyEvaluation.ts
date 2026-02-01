import { Content } from './Content.js';

/**
 * Domain entity representing the result of a safety evaluation
 */
export class SafetyEvaluation {
  constructor(
    public readonly content: Content,
    public readonly overallRisk: RiskLevel,
    public readonly categoryEvaluations: readonly CategoryEvaluation[],
    public readonly summary: string,
    public readonly timestamp: Date = new Date()
  ) {}

  /**
   * Check if content is considered safe (NONE or LOW risk)
   */
  get isSafe(): boolean {
    return this.overallRisk === RiskLevel.NONE || this.overallRisk === RiskLevel.LOW;
  }

  /**
   * Get evaluations with significant risk (MEDIUM or higher)
   */
  get significantRisks(): readonly CategoryEvaluation[] {
    return this.categoryEvaluations.filter(
      (evaluation) =>
        evaluation.riskLevel !== RiskLevel.NONE && evaluation.riskLevel !== RiskLevel.LOW
    );
  }

  /**
   * Get evaluation for a specific category
   */
  getCategoryEvaluation(category: string): CategoryEvaluation | undefined {
    return this.categoryEvaluations.find((evaluation) => evaluation.category === category);
  }
}

/**
 * Evaluation result for a specific safety category
 */
export class CategoryEvaluation {
  constructor(
    public readonly category: string,
    public readonly riskLevel: RiskLevel,
    public readonly explanation: string,
    public readonly confidence?: number
  ) {}
}

/**
 * Risk levels for safety evaluation
 */
export enum RiskLevel {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

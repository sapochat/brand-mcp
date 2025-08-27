import { SafetyEvaluation } from '../entities/SafetyEvaluation.js';
import { ComplianceEvaluation } from '../entities/ComplianceEvaluation.js';

/**
 * Value object representing a combined evaluation result
 */
export class CombinedEvaluationResult {
  constructor(
    public readonly safetyEvaluation?: SafetyEvaluation,
    public readonly complianceEvaluation?: ComplianceEvaluation,
    public readonly combinedScore?: number,
    public readonly weights?: EvaluationWeights
  ) {}

  /**
   * Check if the overall evaluation is compliant
   */
  get isCompliant(): boolean {
    if (this.combinedScore !== undefined) {
      return this.combinedScore >= 70;
    }
    
    // If no combined score, check individual evaluations
    const safetyCompliant = !this.safetyEvaluation || this.safetyEvaluation.isSafe;
    const brandCompliant = !this.complianceEvaluation || this.complianceEvaluation.isCompliant;
    
    return safetyCompliant && brandCompliant;
  }

  /**
   * Get a summary of the evaluation
   */
  get summary(): string {
    if (this.combinedScore !== undefined) {
      return this.isCompliant 
        ? `COMPLIANT: Content achieves a combined score of ${this.combinedScore}.`
        : `NON-COMPLIANT: Content has a combined score of ${this.combinedScore}.`;
    }

    const issues: string[] = [];
    if (this.safetyEvaluation && !this.safetyEvaluation.isSafe) {
      issues.push(`safety concerns (${this.safetyEvaluation.overallRisk})`);
    }
    if (this.complianceEvaluation && !this.complianceEvaluation.isCompliant) {
      issues.push(`brand compliance issues (${this.complianceEvaluation.complianceScore})`);
    }

    return issues.length === 0
      ? 'COMPLIANT: No issues detected.'
      : `NON-COMPLIANT: ${issues.join(' and ')}.`;
  }
}

/**
 * Weights used for combining different evaluation types
 */
export interface EvaluationWeights {
  readonly safety: number;
  readonly brand: number;
}
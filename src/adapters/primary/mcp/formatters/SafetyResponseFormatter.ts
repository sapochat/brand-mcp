import { SafetyEvaluation, RiskLevel } from '../../../../domain/entities/SafetyEvaluation.js';

/**
 * Formats safety evaluation results for MCP responses
 */
export class SafetyResponseFormatter {
  format(evaluation: SafetyEvaluation): string {
    const riskColors = this.getRiskColorIndicators();
    const riskIndicator = riskColors[evaluation.overallRisk] || evaluation.overallRisk;

    let result = `# Brand Safety Evaluation\\n\\n`;
    result += `## Overall Assessment: ${riskIndicator}\\n\\n`;
    result += `${evaluation.summary}\\n\\n`;

    // Format categories with significant issues
    const significantRisks = evaluation.significantRisks;

    if (significantRisks.length > 0) {
      result += `## Areas of Concern\\n\\n`;

      for (const category of significantRisks) {
        const categoryRiskIndicator = riskColors[category.riskLevel] || category.riskLevel;
        result += `### ${category.category}: ${categoryRiskIndicator}\\n`;
        result += `${category.explanation}\\n\\n`;
      }
    }

    // Format safe categories
    const safeCategories = evaluation.categoryEvaluations.filter(
      (item) => item.riskLevel === RiskLevel.NONE || item.riskLevel === RiskLevel.LOW
    );

    if (safeCategories.length > 0) {
      result += `## Safe Categories\\n\\n`;
      result += safeCategories.map((cat) => `- ${cat.category}`).join('\\n');
      result += '\\n\\n';
    }

    // Add timestamp
    result += `*Evaluated at: ${evaluation.timestamp.toISOString()}*\\n`;

    return result;
  }

  private getRiskColorIndicators(): Record<string, string> {
    return {
      [RiskLevel.NONE]: '✅ SAFE',
      [RiskLevel.LOW]: '🟢 LOW RISK',
      [RiskLevel.MEDIUM]: '🟡 CAUTION',
      [RiskLevel.HIGH]: '🔴 HIGH RISK',
      [RiskLevel.VERY_HIGH]: '⛔ UNSAFE',
    };
  }
}

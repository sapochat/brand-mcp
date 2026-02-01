import { BatchEvaluationResult } from '../../../../application/use-cases/BatchEvaluationUseCase.js';

/**
 * Formats batch evaluation results for MCP responses
 */
export class BatchResponseFormatter {
  format(result: BatchEvaluationResult): string {
    let output = `# Batch Evaluation Results\\n\\n`;

    // Header with overall stats
    output += `## Summary\\n\\n`;
    output += `- **Batch ID**: ${result.batchId}\\n`;
    output += `- **Total Items**: ${result.totalItems}\\n`;
    output += `- **Success**: ${result.successCount} (${result.summary.successRate.toFixed(1)}%)\\n`;
    output += `- **Errors**: ${result.errorCount}\\n`;
    output += `- **Processing Time**: ${result.processingTimeMs}ms\\n`;
    output += `- **Evaluation Type**: ${result.evaluationType}\\n\\n`;

    // Aggregate statistics
    if (result.summary.averageComplianceScore > 0) {
      output += `## Aggregate Statistics\\n\\n`;
      output += `- **Average Compliance Score**: ${result.summary.averageComplianceScore.toFixed(1)}/100\\n`;
      output += `- **Compliant Items**: ${result.summary.compliantCount}\\n`;
      output += `- **High Risk Items**: ${result.summary.highRiskCount}\\n\\n`;
    }

    // Common issues
    if (result.summary.commonIssues.length > 0) {
      output += `## Common Issues Found\\n\\n`;
      result.summary.commonIssues.forEach((issue) => {
        output += `- **${issue.type}**: ${issue.description} (${issue.frequency} occurrences)\\n`;
      });
      output += '\\n';
    }

    // Detailed results (limited to first 10 for readability)
    const displayLimit = 10;
    const successfulItems = result.results.slice(0, displayLimit);

    if (successfulItems.length > 0) {
      output += `## Sample Results (First ${Math.min(displayLimit, result.results.length)} items)\\n\\n`;

      successfulItems.forEach((item) => {
        output += `### ${item.id}\\n`;

        // Format based on result type
        if (item.result) {
          if ('overallRisk' in item.result) {
            output += `- Safety Risk: ${this.formatRiskLevel(item.result.overallRisk)}\\n`;
          }

          if ('complianceScore' in item.result) {
            const status = item.result.isCompliant ? '✅' : '❌';
            output += `- Compliance: ${status} ${item.result.complianceScore}/100\\n`;
          }

          if ('combinedScore' in item.result) {
            const status = item.result.isCompliant ? '✅' : '❌';
            output += `- Combined Score: ${status} ${item.result.combinedScore}/100\\n`;
          }

          // Show key issues if any
          if ('issues' in item.result && Array.isArray(item.result.issues)) {
            const topIssues = item.result.issues.slice(0, 3);
            if (topIssues.length > 0) {
              output += `- Issues: ${topIssues.map((i: { type: string }) => i.type).join(', ')}\\n`;
            }
          }
        }
        output += '\\n';
      });

      if (result.results.length > displayLimit) {
        output += `*...and ${result.results.length - displayLimit} more successful evaluations*\\n\\n`;
      }
    }

    // Error summary
    if (result.errors.length > 0) {
      output += `## Errors\\n\\n`;
      const errorSample = result.errors.slice(0, 5);

      errorSample.forEach((error) => {
        output += `- **${error.id}**: ${error.error}\\n`;
        output += `  Content preview: "${error.content}"\\n`;
      });

      if (result.errors.length > 5) {
        output += `\\n*...and ${result.errors.length - 5} more errors*\\n`;
      }
      output += '\\n';
    }

    // Performance metrics
    output += `## Performance Metrics\\n\\n`;
    output += `- **Average Processing Time**: ${result.summary.averageProcessingTimeMs.toFixed(2)}ms per item\\n`;
    output += `- **Total Processing Time**: ${result.processingTimeMs}ms\\n`;
    output += `- **Throughput**: ${(result.totalItems / (result.processingTimeMs / 1000)).toFixed(1)} items/second\\n\\n`;

    // Timestamp
    output += `*Evaluated at: ${result.timestamp.toISOString()}*\\n`;

    return output;
  }

  private formatRiskLevel(risk: string): string {
    const riskIcons: Record<string, string> = {
      NONE: '✅ Safe',
      LOW: '🟢 Low',
      MEDIUM: '🟡 Medium',
      HIGH: '🔴 High',
      VERY_HIGH: '⛔ Very High',
    };
    return riskIcons[risk] || risk;
  }
}

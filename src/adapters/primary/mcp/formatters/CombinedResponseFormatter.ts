import { CombinedEvaluationResult } from '../../../../domain/value-objects/EvaluationResult.js';
import { SafetyResponseFormatter } from './SafetyResponseFormatter.js';
import { ComplianceResponseFormatter } from './ComplianceResponseFormatter.js';

/**
 * Formats combined evaluation results for MCP responses
 */
export class CombinedResponseFormatter {
  
  constructor(
    private readonly safetyFormatter: SafetyResponseFormatter,
    private readonly complianceFormatter: ComplianceResponseFormatter
  ) {}

  format(result: CombinedEvaluationResult): string {
    let output = `# Combined Brand and Safety Evaluation\\n\\n`;
    
    // Overall assessment with combined score if available
    if (result.combinedScore !== undefined) {
      const statusIndicator = result.isCompliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT';
      output += `## Overall Assessment: ${statusIndicator} (Score: ${result.combinedScore}/100)\\n\\n`;
      output += `${result.summary}\\n\\n`;
      
      if (result.weights) {
        output += `*Using weights: Brand ${result.weights.brand}x, Safety ${result.weights.safety}x*\\n\\n`;
      }
    }
    
    // Include brand compliance section if available
    if (result.complianceEvaluation) {
      output += this.formatComplianceSection(result.complianceEvaluation);
    }
    
    // Include safety evaluation section if available
    if (result.safetyEvaluation) {
      output += this.formatSafetySection(result.safetyEvaluation);
    }
    
    // If neither evaluation was performed, provide appropriate message
    if (!result.complianceEvaluation && !result.safetyEvaluation) {
      output += `## No Evaluations Performed\\n\\n`;
      output += `No safety or brand compliance evaluations were requested.\\n\\n`;
    }
    
    return output;
  }

  private formatComplianceSection(evaluation: any): string {
    let output = `## Brand Compliance\\n\\n`;
    output += `Score: ${evaluation.complianceScore}/100 - ${evaluation.isCompliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}\\n\\n`;
    
    // Only show issues if there are any
    if (evaluation.issues && evaluation.issues.length > 0) {
      output += `### Issues Found\\n\\n`;
      
      // Group issues by type
      const issuesByType: Record<string, any[]> = {};
      
      for (const issue of evaluation.issues) {
        if (!issuesByType[issue.type]) {
          issuesByType[issue.type] = [];
        }
        issuesByType[issue.type].push(issue);
      }
      
      // Display each issue type with its issues
      for (const [type, issues] of Object.entries(issuesByType)) {
        output += `#### ${this.capitalizeFirst(type)} Issues\\n\\n`;
        
        for (const issue of issues) {
          const severityIndicator = this.getSeverityIndicator(issue.severity);
          output += `${severityIndicator} **${issue.description}**\\n`;
          output += `   - Suggestion: ${issue.suggestion}\\n\\n`;
        }
      }
    } else {
      output += `✅ No brand issues found.\\n\\n`;
    }
    
    return output;
  }

  private formatSafetySection(evaluation: any): string {
    let output = `## Safety Evaluation\\n\\n`;
    
    const riskColors: Record<string, string> = {
      'NONE': '✅ SAFE',
      'LOW': '🟢 LOW RISK',
      'MEDIUM': '🟡 CAUTION',
      'HIGH': '🔴 HIGH RISK',
      'VERY_HIGH': '⛔ UNSAFE'
    };
    
    const riskIndicator = riskColors[evaluation.overallRisk] || evaluation.overallRisk;
    output += `Overall Risk: ${riskIndicator}\\n\\n`;
    
    // Format the categories with issues
    const categoriesWithIssues = evaluation.evaluations?.filter(
      (item: any) => item.riskLevel !== 'NONE' && item.riskLevel !== 'LOW'
    ) || [];
    
    if (categoriesWithIssues.length > 0) {
      output += `### Areas of Concern\\n\\n`;
      
      for (const category of categoriesWithIssues) {
        const categoryRiskIndicator = riskColors[category.riskLevel] || category.riskLevel;
        output += `#### ${category.category}: ${categoryRiskIndicator}\\n`;
        output += `${category.explanation}\\n\\n`;
      }
    } else {
      output += `✅ No safety concerns detected.\\n\\n`;
    }
    
    return output;
  }

  private getSeverityIndicator(severity: string): string {
    switch (severity) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
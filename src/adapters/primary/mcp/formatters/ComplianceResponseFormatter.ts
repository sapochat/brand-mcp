import { ComplianceEvaluation, IssueSeverity } from '../../../../domain/entities/ComplianceEvaluation.js';

/**
 * Formats brand compliance evaluation results for MCP responses
 */
export class ComplianceResponseFormatter {
  
  format(evaluation: ComplianceEvaluation): string {
    const statusIndicator = this.getStatusIndicator(evaluation);
    
    let output = `# Brand Compliance Evaluation\\n\\n`;
    output += `## Overall Assessment: ${statusIndicator} (Score: ${evaluation.complianceScore}/100)\\n\\n`;
    output += `${evaluation.summary}\\n\\n`;
    
    // Group issues by type
    const issuesByType = this.groupIssuesByType(evaluation);
    
    // Display issues if any exist
    if (evaluation.issues.length > 0) {
      output += `## Issues Found\\n\\n`;
      
      for (const [type, issues] of Object.entries(issuesByType)) {
        output += `### ${this.capitalizeFirst(type)} Issues\\n\\n`;
        
        for (const issue of issues) {
          const severityIndicator = this.getSeverityIndicator(issue.severity);
          output += `${severityIndicator} **${issue.description}**\\n`;
          output += `   - Suggestion: ${issue.suggestion}\\n\\n`;
        }
      }
    } else {
      output += `✅ No issues found. Content is fully compliant with ${evaluation.brand.name} brand guidelines.\\n\\n`;
    }
    
    // Add context information
    if (evaluation.context && evaluation.context !== 'general') {
      output += `*Evaluation context: ${evaluation.context}*\\n\\n`;
    }
    
    // Add timestamp
    output += `*Evaluated at: ${evaluation.timestamp.toISOString()}*\\n`;
    
    return output;
  }

  private getStatusIndicator(evaluation: ComplianceEvaluation): string {
    if (evaluation.isCompliant) {
      return '✅ COMPLIANT';
    } else if (evaluation.complianceScore >= 60) {
      return '🟡 NEEDS IMPROVEMENT';
    } else {
      return '❌ NON-COMPLIANT';
    }
  }

  private groupIssuesByType(evaluation: ComplianceEvaluation): Record<string, any[]> {
    const issuesByType: Record<string, any[]> = {};
    
    for (const issue of evaluation.issues) {
      const type = issue.type;
      if (!issuesByType[type]) {
        issuesByType[type] = [];
      }
      issuesByType[type].push(issue);
    }
    
    return issuesByType;
  }

  private getSeverityIndicator(severity: IssueSeverity): string {
    switch (severity) {
      case IssueSeverity.HIGH:
        return '🔴';
      case IssueSeverity.MEDIUM:
        return '🟡';
      case IssueSeverity.LOW:
        return '🟢';
      default:
        return '⚪';
    }
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
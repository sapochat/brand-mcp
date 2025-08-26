import { ToneAnalysisResult } from './ToneAnalysisService.js';
import { VoiceAnalysisResult } from './VoiceAnalysisService.js';
import { TerminologyAnalysisResult } from './TerminologyAnalysisService.js';
import { BrandComplianceResult, BrandComplianceIssue } from '../types/brandSchema.js';

/**
 * Service responsible for evaluating overall brand compliance
 */
export class ComplianceEvaluationService {
  private readonly weights = {
    tone: 0.35,
    voice: 0.30,
    terminology: 0.35
  };
  
  /**
   * Evaluate compliance based on individual analysis results
   */
  evaluateCompliance(
    toneAnalysis: ToneAnalysisResult,
    voiceAnalysis: VoiceAnalysisResult,
    terminologyAnalysis: TerminologyAnalysisResult,
    content: string,
    context?: string
  ): BrandComplianceResult {
    // Calculate weighted compliance score
    const toneScore = toneAnalysis.toneScore * this.weights.tone;
    const voiceScore = voiceAnalysis.voiceScore * this.weights.voice;
    const terminologyScore = terminologyAnalysis.terminologyScore * this.weights.terminology;
    
    const complianceScore = Math.round(toneScore + voiceScore + terminologyScore);
    
    // Collect all issues
    const issues: BrandComplianceIssue[] = [];
    
    // Add tone issues
    toneAnalysis.issues.forEach(issue => {
      issues.push({
        type: 'tone',
        severity: this.calculateSeverity(issue),
        description: issue,
        suggestion: this.generateSuggestion(issue, 'tone')
      });
    });
    
    // Add voice issues
    voiceAnalysis.issues.forEach(issue => {
      issues.push({
        type: 'voice',
        severity: this.calculateSeverity(issue),
        description: issue,
        suggestion: this.generateSuggestion(issue, 'voice')
      });
    });
    
    // Add terminology issues
    terminologyAnalysis.issues.forEach(issue => {
      issues.push({
        type: 'terminology',
        severity: this.calculateSeverity(issue),
        description: issue,
        suggestion: this.generateSuggestion(issue, 'terminology')
      });
    });
    
    // Sort issues by severity
    issues.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
    
    // Generate summary
    const summary = this.generateSummary(complianceScore, issues, context);
    
    return {
      content,
      isCompliant: complianceScore >= 80,
      complianceScore,
      issues,
      summary,
      timestamp: new Date().toISOString(),
      brandName: 'TechFuture', // This should come from brand schema
      context,
      details: {
        tone: {
          score: toneAnalysis.toneScore,
          primaryToneMatch: toneAnalysis.primaryToneMatch,
          avoidedTonesDetected: toneAnalysis.avoidedTonesDetected
        },
        voice: {
          score: voiceAnalysis.voiceScore,
          contractionUsage: voiceAnalysis.contractionUsage.appropriate,
          pronounUsage: voiceAnalysis.pronounUsage.appropriate,
          sentenceStructure: voiceAnalysis.sentenceStructure.appropriate
        },
        terminology: {
          score: terminologyAnalysis.terminologyScore,
          avoidedTermsCount: terminologyAnalysis.avoidedTermsFound.length,
          preferredTermsMissedCount: terminologyAnalysis.preferredTermsMissed.length
        }
      }
    };
  }
  
  /**
   * Generate suggestion for an issue
   */
  private generateSuggestion(issue: string, type: string): string {
    const suggestions: Record<string, string> = {
      tone: 'Adjust the tone to better match brand guidelines',
      voice: 'Modify voice characteristics to align with brand standards',
      terminology: 'Use approved terminology and avoid restricted terms'
    };
    
    // More specific suggestions based on issue content
    if (issue.includes('contraction')) {
      return 'Review contraction usage according to brand voice';
    }
    if (issue.includes('avoided term')) {
      return 'Replace with approved alternative terminology';
    }
    if (issue.includes('pronoun')) {
      return 'Adjust pronoun usage to match brand voice guidelines';
    }
    
    return suggestions[type] || 'Review and adjust according to brand guidelines';
  }
  
  /**
   * Calculate severity of an issue
   */
  private calculateSeverity(issue: string): 'low' | 'medium' | 'high' {
    const highSeverityKeywords = ['avoided', 'forbidden', 'never', 'critical'];
    const mediumSeverityKeywords = ['should', 'prefer', 'recommended'];
    
    const issueLower = issue.toLowerCase();
    
    if (highSeverityKeywords.some(keyword => issueLower.includes(keyword))) {
      return 'high';
    }
    
    if (mediumSeverityKeywords.some(keyword => issueLower.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Find the location of an issue in the content
   */
  private findIssueLocation(issue: string, content: string): string | undefined {
    // Extract potential problematic text from the issue message
    const quotedMatch = issue.match(/"([^"]+)"/);
    if (quotedMatch) {
      const problematicText = quotedMatch[1];
      const index = content.toLowerCase().indexOf(problematicText.toLowerCase());
      if (index !== -1) {
        const lineNumber = content.substring(0, index).split('\n').length;
        return `Line ${lineNumber}`;
      }
    }
    
    return undefined;
  }
  
  /**
   * Generate a compliance summary
   */
  private generateSummary(score: number, issues: BrandComplianceIssue[], context?: string): string {
    let summary = '';
    
    if (score >= 90) {
      summary = 'Excellent brand compliance. Content strongly aligns with brand guidelines.';
    } else if (score >= 80) {
      summary = 'Good brand compliance. Minor adjustments recommended.';
    } else if (score >= 70) {
      summary = 'Moderate brand compliance. Several issues need attention.';
    } else if (score >= 60) {
      summary = 'Poor brand compliance. Significant revisions required.';
    } else {
      summary = 'Very poor brand compliance. Content needs major rework.';
    }
    
    if (context) {
      summary += ` (Evaluated for ${context} context)`;
    }
    
    if (issues.length > 0) {
      const highSeverityCount = issues.filter(i => i.severity === 'high').length;
      const mediumSeverityCount = issues.filter(i => i.severity === 'medium').length;
      
      if (highSeverityCount > 0) {
        summary += ` Found ${highSeverityCount} high-severity issue${highSeverityCount > 1 ? 's' : ''}.`;
      }
      if (mediumSeverityCount > 0) {
        summary += ` Found ${mediumSeverityCount} medium-severity issue${mediumSeverityCount > 1 ? 's' : ''}.`;
      }
    }
    
    return summary;
  }
  
  /**
   * Update weights for compliance calculation
   */
  updateWeights(weights: { tone?: number; voice?: number; terminology?: number }): void {
    if (weights.tone !== undefined) this.weights.tone = weights.tone;
    if (weights.voice !== undefined) this.weights.voice = weights.voice;
    if (weights.terminology !== undefined) this.weights.terminology = weights.terminology;
    
    // Normalize weights
    const total = this.weights.tone + this.weights.voice + this.weights.terminology;
    this.weights.tone /= total;
    this.weights.voice /= total;
    this.weights.terminology /= total;
  }
}
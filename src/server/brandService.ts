import { BrandSchema, BrandComplianceIssue, BrandComplianceResult } from '../types/brandSchema.js';

export class BrandService {
  private brandSchema: BrandSchema | null = null;
  private defaultContext: string = 'general';

  constructor(brandSchema?: BrandSchema) {
    if (brandSchema) {
      this.setBrandSchema(brandSchema);
    }
  }

  /**
   * Set the brand schema to use for compliance checks
   */
  setBrandSchema(brandSchema: BrandSchema): void {
    this.brandSchema = brandSchema;
  }

  /**
   * Get the current brand schema
   */
  getBrandSchema(): BrandSchema | null {
    return this.brandSchema;
  }

  /**
   * Check if content complies with brand guidelines
   */
  checkBrandCompliance(content: string, context: string = this.defaultContext): BrandComplianceResult {
    if (!this.brandSchema) {
      throw new Error('Brand schema is not set');
    }

    const issues: BrandComplianceIssue[] = [];
    
    // Check for tone compliance
    const toneIssues = this.checkToneCompliance(content, context);
    issues.push(...toneIssues);
    
    // Check for voice compliance
    const voiceIssues = this.checkVoiceCompliance(content, context);
    issues.push(...voiceIssues);
    
    // Check for terminology compliance
    const terminologyIssues = this.checkTerminologyCompliance(content, context);
    issues.push(...terminologyIssues);

    // Calculate compliance score (inversely proportional to number and severity of issues)
    const complianceScore = this.calculateComplianceScore(issues);
    
    // Determine overall compliance
    const isCompliant = complianceScore >= 80;
    
    // Generate summary
    const summary = this.generateComplianceSummary(issues, complianceScore, isCompliant);
    
    return {
      content,
      isCompliant,
      complianceScore,
      issues,
      summary,
      timestamp: new Date().toISOString(),
      brandName: this.brandSchema.name,
      context
    };
  }

  /**
   * Check content for tone compliance
   */
  private checkToneCompliance(content: string, context: string): BrandComplianceIssue[] {
    const issues: BrandComplianceIssue[] = [];
    const lowerContent = content.toLowerCase();
    
    if (!this.brandSchema) return issues;
    
    // Get context-specific tone if available
    const contextualTone = this.getContextualTone(context);
    const primaryTone = contextualTone || this.brandSchema.toneGuidelines.primaryTone;
    
    // Check for avoided tones
    for (const avoidedTone of this.brandSchema.toneGuidelines.avoidedTones) {
      if (this.detectTone(lowerContent, avoidedTone)) {
        issues.push({
          type: 'tone',
          severity: 'high',
          description: `Content uses avoided tone: "${avoidedTone}"`,
          suggestion: `Rewrite to align with the brand's preferred tone: "${primaryTone}"`
        });
      }
    }
    
    // Simple tone detection - in a real implementation, this would use more sophisticated NLP
    if (!this.detectTone(lowerContent, primaryTone)) {
      issues.push({
        type: 'tone',
        severity: 'medium',
        description: `Content may not align with the brand's primary tone: "${primaryTone}"`,
        suggestion: `Consider adjusting tone to be more ${primaryTone}`
      });
    }
    
    return issues;
  }

  /**
   * Check content for voice compliance
   */
  private checkVoiceCompliance(content: string, context: string): BrandComplianceIssue[] {
    const issues: BrandComplianceIssue[] = [];
    
    if (!this.brandSchema) return issues;
    
    const voiceGuidelines = this.getContextualVoice(context) || this.brandSchema.voiceGuidelines;
    
    // Check for contractions usage
    const hasContractions = /'\w+\b/.test(content);
    if (voiceGuidelines.usesContractions !== hasContractions) {
      issues.push({
        type: 'voice',
        severity: 'low',
        description: voiceGuidelines.usesContractions 
          ? 'Content doesn\'t use contractions when brand voice prefers them' 
          : 'Content uses contractions when brand voice avoids them',
        suggestion: voiceGuidelines.usesContractions
          ? 'Use contractions (e.g., "don\'t" instead of "do not")'
          : 'Avoid contractions (e.g., "do not" instead of "don\'t")'
      });
    }
    
    // Check for first-person pronouns
    const hasFirstPerson = /\b(I|we|our|us|my)\b/i.test(content);
    if (voiceGuidelines.usesPronoun.firstPerson !== hasFirstPerson) {
      issues.push({
        type: 'voice',
        severity: 'medium',
        description: voiceGuidelines.usesPronoun.firstPerson
          ? 'Content doesn\'t use first-person pronouns when brand voice prefers them'
          : 'Content uses first-person pronouns when brand voice avoids them',
        suggestion: voiceGuidelines.usesPronoun.firstPerson
          ? 'Include first-person pronouns (I, we, our, us) where appropriate'
          : 'Avoid first-person pronouns (I, we, our, us)'
      });
    }
    
    // Check for second-person pronouns
    const hasSecondPerson = /\b(you|your)\b/i.test(content);
    if (voiceGuidelines.usesPronoun.secondPerson !== hasSecondPerson) {
      issues.push({
        type: 'voice',
        severity: 'medium',
        description: voiceGuidelines.usesPronoun.secondPerson
          ? 'Content doesn\'t use second-person pronouns when brand voice prefers them'
          : 'Content uses second-person pronouns when brand voice avoids them',
        suggestion: voiceGuidelines.usesPronoun.secondPerson
          ? 'Include second-person pronouns (you, your) where appropriate'
          : 'Avoid second-person pronouns (you, your)'
      });
    }
    
    return issues;
  }

  /**
   * Check content for terminology compliance
   */
  private checkTerminologyCompliance(content: string, context: string): BrandComplianceIssue[] {
    const issues: BrandComplianceIssue[] = [];
    
    if (!this.brandSchema) return issues;
    
    const lowerContent = content.toLowerCase();
    
    // Check for globally avoided terms
    for (const term of this.brandSchema.terminologyGuidelines.avoidedGlobalTerms) {
      if (new RegExp(`\\b${term}\\b`, 'i').test(content)) {
        issues.push({
          type: 'terminology',
          severity: 'high',
          description: `Content uses globally avoided term: "${term}"`,
          suggestion: `Remove or replace the term "${term}"`
        });
      }
    }
    
    // Check for proper noun formatting
    for (const [noun, format] of Object.entries(this.brandSchema.terminologyGuidelines.properNouns)) {
      const incorrectFormats = this.checkProperNounFormatting(content, noun, format);
      if (incorrectFormats.length > 0) {
        issues.push({
          type: 'terminology',
          severity: 'medium',
          description: `Improper formatting of "${noun}": found "${incorrectFormats.join('", "')}"`,
          suggestion: `Use the correct format: "${format}"`
        });
      }
    }
    
    // Check for preferred/avoided terms based on context
    for (const termRule of this.brandSchema.terminologyGuidelines.terms) {
      // Skip if this term should only be applied in specific contexts that don't include the current context
      if (termRule.contexts && !termRule.contexts.includes(context)) {
        continue;
      }
      
      // Skip if this term should be avoided in the current context
      if (termRule.avoidInContexts && termRule.avoidInContexts.includes(context)) {
        continue;
      }
      
      // Check for preferred terms
      if (termRule.preferred) {
        const alternatives = termRule.alternatives || [];
        
        for (const alt of alternatives) {
          if (new RegExp(`\\b${alt}\\b`, 'i').test(content)) {
            issues.push({
              type: 'terminology',
              severity: 'medium',
              description: `Content uses "${alt}" instead of the preferred term "${termRule.preferred}"`,
              suggestion: `Replace "${alt}" with "${termRule.preferred}"`
            });
          }
        }
      }
      
      // Check for terms to avoid in specific contexts
      if (termRule.term && termRule.avoidInContexts && termRule.avoidInContexts.includes(context)) {
        if (new RegExp(`\\b${termRule.term}\\b`, 'i').test(content)) {
          issues.push({
            type: 'terminology',
            severity: 'medium',
            description: `Term "${termRule.term}" should be avoided in "${context}" context`,
            suggestion: termRule.notes || `Consider an alternative to "${termRule.term}"`
          });
        }
      }
    }
    
    return issues;
  }

  /**
   * Check for proper noun formatting (e.g., "TechFuture" vs "techfuture")
   */
  private checkProperNounFormatting(content: string, noun: string, correctFormat: string): string[] {
    const incorrectFormats: string[] = [];
    const nounRegex = new RegExp(`\\b${noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    
    // Find all instances of the noun
    const matches = content.match(new RegExp(nounRegex, 'gi')) || [];
    
    // Check if any instances don't match the correct format
    for (const match of matches) {
      if (match !== correctFormat) {
        incorrectFormats.push(match);
      }
    }
    
    return incorrectFormats;
  }

  /**
   * Calculate compliance score based on issues
   */
  private calculateComplianceScore(issues: BrandComplianceIssue[]): number {
    if (issues.length === 0) return 100;
    
    // Assign weights based on severity
    const severityWeights = {
      low: 1,
      medium: 3,
      high: 5
    };
    
    // Calculate total severity points
    const totalSeverityPoints = issues.reduce((sum, issue) => {
      return sum + severityWeights[issue.severity];
    }, 0);
    
    // Calculate score (inverse relationship with severity points)
    const maxPoints = 20; // Threshold above which score is 0
    const score = Math.max(0, 100 - (totalSeverityPoints / maxPoints) * 100);
    
    return Math.round(score);
  }

  /**
   * Generate a summary of compliance issues
   */
  private generateComplianceSummary(issues: BrandComplianceIssue[], score: number, isCompliant: boolean): string {
    if (issues.length === 0) {
      return `COMPLIANT: Content fully complies with ${this.brandSchema?.name} brand guidelines (100% compliance score).`;
    }
    
    const highIssues = issues.filter(issue => issue.severity === 'high').length;
    const mediumIssues = issues.filter(issue => issue.severity === 'medium').length;
    const lowIssues = issues.filter(issue => issue.severity === 'low').length;
    
    if (!isCompliant) {
      return `NON-COMPLIANT: Content does not meet ${this.brandSchema?.name} brand guidelines (${score}% compliance). Found ${highIssues} high, ${mediumIssues} medium, and ${lowIssues} low severity issues.`;
    } else {
      return `MOSTLY COMPLIANT: Content generally aligns with ${this.brandSchema?.name} brand guidelines (${score}% compliance). Found ${highIssues} high, ${mediumIssues} medium, and ${lowIssues} low severity issues that should be addressed.`;
    }
  }

  /**
   * Detect if content matches a specific tone
   * This is a simplified implementation - a real version would use NLP
   */
  private detectTone(content: string, tone: string): boolean {
    // Map tones to simple keyword indicators
    const toneIndicators: Record<string, string[]> = {
      'confident': ['definitely', 'certainly', 'absolutely', 'will', 'can'],
      'optimistic': ['opportunity', 'exciting', 'potential', 'positive', 'future'],
      'innovative': ['new', 'breakthrough', 'revolutionary', 'cutting-edge', 'advanced'],
      'approachable': ['help', 'simple', 'easy', 'welcome', 'friendly'],
      'professional': ['expertise', 'professional', 'standards', 'quality', 'results'],
      'authoritative': ['expert', 'leading', 'authority', 'proven', 'established'],
      'friendly': ['welcome', 'thanks', 'please', 'happy to', 'glad'],
      'casual': ['hey', 'cool', 'awesome', 'check out', 'great']
    };
    
    // Get indicators for the specified tone
    const indicators = toneIndicators[tone.toLowerCase()] || [];
    
    // If no indicators are defined for this tone, we can't detect it
    if (indicators.length === 0) {
      return true; // Assume compliance if we can't detect
    }
    
    // Check if content contains any of the tone indicators
    return indicators.some(indicator => content.includes(indicator));
  }

  /**
   * Get contextual tone for a specific context
   */
  private getContextualTone(context: string): string | null {
    if (!this.brandSchema) return null;
    
    // Look for a contextual adjustment that matches the context
    for (const adjustment of this.brandSchema.contextualAdjustments) {
      if (adjustment.contexts.includes(context) && adjustment.applyRules.tone) {
        return adjustment.applyRules.tone;
      }
    }
    
    // Check tonalShift in toneGuidelines
    if (this.brandSchema.toneGuidelines.tonalShift[context]) {
      return this.brandSchema.toneGuidelines.tonalShift[context];
    }
    
    return null;
  }

  /**
   * Get contextual voice for a specific context
   */
  private getContextualVoice(context: string): any | null {
    if (!this.brandSchema) return null;
    
    // Look for a contextual adjustment that matches the context
    for (const adjustment of this.brandSchema.contextualAdjustments) {
      if (adjustment.contexts.includes(context) && adjustment.applyRules.voice) {
        // Merge with base voice guidelines
        return {
          ...this.brandSchema.voiceGuidelines,
          ...adjustment.applyRules.voice,
          sentence: {
            ...this.brandSchema.voiceGuidelines.sentence,
            length: adjustment.applyRules.voice.sentenceLength || this.brandSchema.voiceGuidelines.sentence.length,
            structure: adjustment.applyRules.voice.sentenceStructure || this.brandSchema.voiceGuidelines.sentence.structure
          }
        };
      }
    }
    
    return null;
  }
} 
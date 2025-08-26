import { BrandSchema } from '../types/brandSchema.js';

/**
 * Service responsible for analyzing voice characteristics in content
 */
export class VoiceAnalysisService {
  private brandSchema: BrandSchema | null = null;
  
  constructor(brandSchema?: BrandSchema) {
    if (brandSchema) {
      this.brandSchema = brandSchema;
    }
  }
  
  /**
   * Set or update the brand schema
   */
  setBrandSchema(schema: BrandSchema): void {
    this.brandSchema = schema;
  }
  
  /**
   * Analyze voice characteristics in content
   */
  analyzeVoice(content: string, context?: string): VoiceAnalysisResult {
    if (!this.brandSchema || !this.brandSchema.voiceGuidelines) {
      return {
        contractionUsage: { appropriate: true, issues: [] },
        pronounUsage: { appropriate: true, issues: [] },
        sentenceStructure: { appropriate: true, issues: [] },
        voiceScore: 100,
        issues: []
      };
    }
    
    const guidelines = this.brandSchema.voiceGuidelines;
    const issues: string[] = [];
    let voiceScore = 100;
    
    // Analyze contractions
    const contractionAnalysis = this.analyzeContractions(content, guidelines);
    if (!contractionAnalysis.appropriate) {
      voiceScore -= 15;
      issues.push(...contractionAnalysis.issues);
    }
    
    // Analyze pronoun usage
    const pronounAnalysis = this.analyzePronounUsage(content, guidelines);
    if (!pronounAnalysis.appropriate) {
      voiceScore -= 15;
      issues.push(...pronounAnalysis.issues);
    }
    
    // Analyze sentence structure
    const structureAnalysis = this.analyzeSentenceStructure(content, guidelines);
    if (!structureAnalysis.appropriate) {
      voiceScore -= 20;
      issues.push(...structureAnalysis.issues);
    }
    
    // Apply context-specific adjustments
    const contextAdjustments = this.getContextAdjustments(context);
    if (contextAdjustments) {
      // Re-evaluate based on context
      if (contextAdjustments.usesContractions !== undefined) {
        const contextContractionAnalysis = this.analyzeContractions(
          content, 
          { ...guidelines, usesContractions: contextAdjustments.usesContractions }
        );
        if (contextContractionAnalysis.appropriate && !contractionAnalysis.appropriate) {
          voiceScore += 15; // Restore score if context makes it appropriate
          // Remove contraction issues from the issues array
          const issuesToRemove = contractionAnalysis.issues;
          for (const issueToRemove of issuesToRemove) {
            const index = issues.indexOf(issueToRemove);
            if (index !== -1) {
              issues.splice(index, 1);
            }
          }
        }
      }
    }
    
    return {
      contractionUsage: contractionAnalysis,
      pronounUsage: pronounAnalysis,
      sentenceStructure: structureAnalysis,
      contextAdjustments,
      voiceScore: Math.max(0, voiceScore),
      issues
    };
  }
  
  /**
   * Analyze contraction usage
   */
  private analyzeContractions(content: string, guidelines: any): UsageAnalysis {
    const contractionPattern = /\b(won't|can't|don't|doesn't|haven't|hasn't|hadn't|wouldn't|couldn't|shouldn't|we're|we've|we'd|we'll|you're|you've|you'd|you'll|they're|they've|they'd|they'll|it's|it'd|it'll|that's|that'd|that'll|what's|what'd|what'll|who's|who'd|who'll|where's|where'd|where'll|when's|when'd|when'll|why's|why'd|why'll|how's|how'd|how'll)\b/gi;
    const contractions = content.match(contractionPattern) || [];
    
    const issues: string[] = [];
    let appropriate = true;
    
    if (guidelines.usesContractions && contractions.length === 0) {
      const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 10);
      if (sentences.length > 3) {
        issues.push('Brand voice uses contractions but none were found');
        appropriate = false;
      }
    } else if (!guidelines.usesContractions && contractions.length > 0) {
      issues.push(`Brand voice avoids contractions but found: ${contractions.slice(0, 3).join(', ')}`);
      appropriate = false;
    }
    
    return { appropriate, issues, count: contractions.length };
  }
  
  /**
   * Analyze pronoun usage
   */
  private analyzePronounUsage(content: string, guidelines: any): UsageAnalysis {
    const firstPersonPattern = /\b(we|our|ours|us)\b/gi;
    const secondPersonPattern = /\b(you|your|yours)\b/gi;
    
    const firstPersonMatches = content.match(firstPersonPattern) || [];
    const secondPersonMatches = content.match(secondPersonPattern) || [];
    
    const issues: string[] = [];
    let appropriate = true;
    
    if (guidelines.usesPronoun) {
      if (guidelines.usesPronoun.firstPerson && firstPersonMatches.length === 0) {
        const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 20);
        if (sentences.length > 2) {
          issues.push('Brand voice uses first-person pronouns but none were found');
          appropriate = false;
        }
      }
      
      if (guidelines.usesPronoun.secondPerson && secondPersonMatches.length === 0) {
        const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 20);
        if (sentences.length > 2) {
          issues.push('Brand voice uses second-person pronouns but none were found');
          appropriate = false;
        }
      }
      
      if (!guidelines.usesPronoun.firstPerson && firstPersonMatches.length > 2) {
        issues.push('Brand voice avoids first-person pronouns but several were found');
        appropriate = false;
      }
      
      if (!guidelines.usesPronoun.secondPerson && secondPersonMatches.length > 2) {
        issues.push('Brand voice avoids second-person pronouns but several were found');
        appropriate = false;
      }
    }
    
    return {
      appropriate,
      issues,
      firstPersonCount: firstPersonMatches.length,
      secondPersonCount: secondPersonMatches.length
    };
  }
  
  /**
   * Analyze sentence structure
   */
  private analyzeSentenceStructure(content: string, guidelines: any): UsageAnalysis {
    const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 0);
    const wordCounts = sentences.map(s => s.trim().split(/\s+/).length);
    const avgWordCount = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
    
    const issues: string[] = [];
    let appropriate = true;
    
    if (guidelines.sentence) {
      // Check sentence length
      if (guidelines.sentence.length) {
        if (guidelines.sentence.length.includes('concise') && avgWordCount > 20) {
          issues.push(`Sentences are too long (avg: ${avgWordCount.toFixed(1)} words) for concise voice`);
          appropriate = false;
        } else if (guidelines.sentence.length.includes('varied')) {
          const variance = this.calculateVariance(wordCounts);
          if (variance < 10) {
            issues.push('Sentence lengths lack variation');
            appropriate = false;
          }
        }
      }
      
      // Check sentence structure
      if (guidelines.sentence.structure) {
        if (guidelines.sentence.structure.includes('direct')) {
          const passiveVoiceCount = this.countPassiveVoice(content);
          if (passiveVoiceCount > sentences.length * 0.3) {
            issues.push('Too much passive voice for direct communication style');
            appropriate = false;
          }
        }
      }
    }
    
    return {
      appropriate,
      issues,
      avgSentenceLength: avgWordCount
    };
  }
  
  /**
   * Count passive voice constructions
   */
  private countPassiveVoice(content: string): number {
    const passivePatterns = [
      /\b(is|are|was|were|been|being)\s+\w+ed\b/gi,
      /\b(is|are|was|were|been|being)\s+\w+en\b/gi,
      /\bby\s+the\s+\w+/gi
    ];
    
    let count = 0;
    passivePatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      count += matches.length;
    });
    
    return count;
  }
  
  /**
   * Calculate variance in word counts
   */
  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length);
  }
  
  /**
   * Get context-specific adjustments
   */
  private getContextAdjustments(context?: string): any {
    if (!context || !this.brandSchema) {
      return null;
    }
    
    const adjustments = this.brandSchema.contextualAdjustments || [];
    for (const adjustment of adjustments) {
      if (adjustment.contexts.includes(context)) {
        return adjustment.applyRules.voice || null;
      }
    }
    
    return null;
  }
}

/**
 * Result of voice analysis
 */
export interface VoiceAnalysisResult {
  contractionUsage: UsageAnalysis;
  pronounUsage: UsageAnalysis;
  sentenceStructure: UsageAnalysis;
  contextAdjustments?: any;
  voiceScore: number;
  issues: string[];
}

/**
 * Usage analysis result
 */
export interface UsageAnalysis {
  appropriate: boolean;
  issues: string[];
  count?: number;
  firstPersonCount?: number;
  secondPersonCount?: number;
  avgSentenceLength?: number;
}
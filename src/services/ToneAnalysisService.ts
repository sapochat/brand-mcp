import { BrandSchema } from '../types/brandSchema.js';

/**
 * Tone detection result with confidence score
 */
export interface ToneDetectionResult {
  detected: boolean;
  confidence: number;
  matches: string[];
  context?: string;
}

/**
 * Service responsible for analyzing tone in content
 */
export class ToneAnalysisService {
  private brandSchema: BrandSchema | null = null;
  private toneKeywords: Map<string, string[]> = new Map([
    ['confident', ['we believe', 'certainly', 'definitely', 'proven', 'guaranteed', 'assured']],
    ['optimistic', ['excited', 'opportunity', 'growth', 'positive', 'bright future', 'looking forward']],
    ['innovative', ['breakthrough', 'revolutionary', 'cutting-edge', 'pioneering', 'transform']],
    ['approachable', ['we\'re here', 'let us help', 'feel free', 'happy to', 'glad to']],
    ['pessimistic', ['unfortunately', 'impossible', 'cannot', 'won\'t work', 'failed']],
    ['condescending', ['obviously', 'clearly you don\'t', 'as you should know', 'simple enough']],
    ['overly technical', ['algorithm', 'infrastructure', 'deployment', 'implementation', 'architecture']],
  ]);
  
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
   * Analyze tone in content
   */
  analyzeTone(content: string, context?: string): ToneAnalysisResult {
    if (!this.brandSchema) {
      return {
        primaryToneMatch: false,
        avoidedTonesDetected: [],
        contextAdjustments: null,
        toneScore: 100,
        issues: []
      };
    }
    
    const contentLower = content.toLowerCase();
    const guidelines = this.brandSchema.toneGuidelines;
    
    // Check for primary tone
    const primaryToneResult = this.detectTone(contentLower, guidelines.primaryTone);
    
    // Check for avoided tones
    const avoidedTonesDetected = guidelines.avoidedTones
      .map(tone => ({
        tone,
        result: this.detectTone(contentLower, tone)
      }))
      .filter(item => item.result.detected)
      .map(item => item.tone);
    
    // Apply context-specific adjustments
    const contextAdjustments = this.getContextAdjustments(context);
    
    // Calculate tone score
    let toneScore = 100;
    const issues: string[] = [];
    
    if (!primaryToneResult.detected && primaryToneResult.confidence < 0.3) {
      toneScore -= 20;
      issues.push(`Content doesn't strongly reflect the ${guidelines.primaryTone} tone`);
    }
    
    avoidedTonesDetected.forEach(tone => {
      toneScore -= 25;
      issues.push(`Detected avoided tone: ${tone}`);
    });
    
    return {
      primaryToneMatch: primaryToneResult.detected,
      primaryToneConfidence: primaryToneResult.confidence,
      avoidedTonesDetected,
      contextAdjustments,
      toneScore: Math.max(0, toneScore),
      issues
    };
  }
  
  /**
   * Detect a specific tone in content with confidence scoring
   */
  detectTone(content: string, tone: string): ToneDetectionResult {
    const keywords = this.toneKeywords.get(tone) || [];
    const matches: string[] = [];
    let confidence = 0;
    
    // Check for keyword matches
    keywords.forEach(keyword => {
      if (content.includes(keyword)) {
        matches.push(keyword);
        confidence += 0.2;
      }
    });
    
    // Check for phrase patterns
    const phrasePatterns = this.getTonePhrasePatterns(tone);
    phrasePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        confidence += 0.3;
      }
    });
    
    // Normalize confidence to 0-1 range
    confidence = Math.min(1, confidence);
    
    return {
      detected: confidence > 0.5,
      confidence,
      matches
    };
  }
  
  /**
   * Get phrase patterns for a specific tone
   */
  private getTonePhrasePatterns(tone: string): RegExp[] {
    const patterns: Record<string, RegExp[]> = {
      confident: [
        /we (believe|know|understand)/gi,
        /(proven|guaranteed) (results|solution)/gi,
        /with (confidence|certainty)/gi
      ],
      optimistic: [
        /looking forward to/gi,
        /excited (about|to)/gi,
        /bright future/gi
      ],
      innovative: [
        /cutting[- ]edge/gi,
        /break(ing)?through/gi,
        /transform(ing|ative)/gi
      ],
      pessimistic: [
        /(unfortunately|sadly)/gi,
        /won'?t (work|be possible)/gi,
        /impossible to/gi
      ]
    };
    
    return patterns[tone] || [];
  }
  
  /**
   * Get context-specific adjustments
   */
  private getContextAdjustments(context?: string): string | null {
    if (!context || !this.brandSchema) {
      return null;
    }
    
    const adjustments = this.brandSchema.contextualAdjustments || [];
    for (const adjustment of adjustments) {
      if (adjustment.contexts.includes(context)) {
        if (typeof adjustment.applyRules.tone === 'string') {
          return adjustment.applyRules.tone;
        }
      }
    }
    
    return null;
  }
}

/**
 * Result of tone analysis
 */
export interface ToneAnalysisResult {
  primaryToneMatch: boolean;
  primaryToneConfidence?: number;
  avoidedTonesDetected: string[];
  contextAdjustments: string | null;
  toneScore: number;
  issues: string[];
}
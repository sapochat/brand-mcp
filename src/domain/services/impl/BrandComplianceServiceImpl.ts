import { BrandComplianceService } from '../BrandComplianceService.js';
import { Content } from '../../entities/Content.js';
import { Brand } from '../../entities/Brand.js';
import {
  ComplianceEvaluation,
  ComplianceIssue,
  IssueType,
  IssueSeverity,
} from '../../entities/ComplianceEvaluation.js';

/**
 * Domain service implementation for brand compliance evaluation
 */
export class BrandComplianceServiceImpl implements BrandComplianceService {
  private currentBrand: Brand | null = null;

  // Technical terms that are exempt from tone analysis
  private readonly technicalTermsAllowlist: string[] = [
    'api',
    'sdk',
    'ui',
    'ux',
    'http',
    'rest',
    'json',
    'xml',
    'database',
    'server',
    'client',
    'interface',
    'framework',
    'library',
    'component',
    'function',
    'class',
    'algorithm',
    'parameter',
    'configuration',
    'deployment',
    'integration',
    'authentication',
    'content recognition system',
    'machine learning',
    'artificial intelligence',
    'neural network',
    'data processing',
    'software',
    'hardware',
    'platform',
    'architecture',
    'infrastructure',
    'repository',
    'codebase',
    'pipeline',
    'workflow',
    'backend',
    'frontend',
    'fullstack',
  ];

  // Technical contexts that should have relaxed tone requirements
  private readonly technicalContexts: string[] = [
    'technical-documentation',
    'api-reference',
    'developer-guide',
    'product-specs',
    'technical-specs',
    'feature-description',
    'technical-support',
    'code-example',
    'implementation-guide',
  ];

  checkCompliance(content: Content, brand: Brand, context = 'general'): ComplianceEvaluation {
    if (!brand) {
      throw new Error('Brand is required for compliance evaluation');
    }

    this.currentBrand = brand;
    const issues: ComplianceIssue[] = [];
    let complianceScore = 100;

    // Apply contextual adjustments if available
    const effectiveGuidelines = this.applyContextualAdjustments(brand, context);

    // Check tone compliance
    const toneIssues = this.checkToneCompliance(content, effectiveGuidelines, context);
    issues.push(...toneIssues);

    // Check voice compliance
    const voiceIssues = this.checkVoiceCompliance(content, effectiveGuidelines);
    issues.push(...voiceIssues);

    // Check terminology compliance
    const terminologyIssues = this.checkTerminologyCompliance(
      content,
      effectiveGuidelines,
      context
    );
    issues.push(...terminologyIssues);

    // Calculate compliance score based on issues
    complianceScore = this.calculateComplianceScore(issues);

    // Generate summary
    const summary = this.generateComplianceSummary(complianceScore, issues, brand.name);

    return new ComplianceEvaluation(content, brand, complianceScore, issues, summary, context);
  }

  setBrand(brand: Brand): void {
    this.currentBrand = brand;
  }

  getBrand(): Brand | null {
    return this.currentBrand;
  }

  private applyContextualAdjustments(brand: Brand, context: string): Brand {
    if (!brand.contextualAdjustments) return brand;

    const applicableAdjustment = brand.contextualAdjustments.find((adj) =>
      adj.contexts.includes(context)
    );

    if (!applicableAdjustment) return brand;

    // Create a modified brand with contextual adjustments
    const adjustedToneGuidelines = {
      ...brand.toneGuidelines,
      primaryTone: applicableAdjustment.applyRules.tone || brand.toneGuidelines.primaryTone,
    };

    const adjustedVoiceGuidelines = {
      ...brand.voiceGuidelines,
      ...applicableAdjustment.applyRules.voice,
    };

    return new Brand(
      brand.name,
      brand.description,
      adjustedToneGuidelines,
      adjustedVoiceGuidelines,
      brand.terminologyGuidelines,
      brand.visualIdentity,
      brand.contextualAdjustments
    );
  }

  private checkToneCompliance(content: Content, brand: Brand, context: string): ComplianceIssue[] {
    const issues: ComplianceIssue[] = [];
    const text = content.normalizedText.toLowerCase();

    // Skip tone analysis for technical contexts
    if (this.technicalContexts.includes(context)) {
      return issues;
    }

    // Check for avoided tones
    for (const avoidedTone of brand.toneGuidelines.avoidedTones) {
      if (this.detectTone(text, avoidedTone)) {
        issues.push(
          new ComplianceIssue(
            IssueType.TONE,
            IssueSeverity.MEDIUM,
            `Content uses avoided tone: ${avoidedTone}`,
            `Adjust language to align with brand's preferred tone: ${brand.toneGuidelines.primaryTone}`,
            context
          )
        );
      }
    }

    // Check if primary tone is present (for longer content)
    if (content.isLongForm && !this.detectTone(text, brand.toneGuidelines.primaryTone)) {
      issues.push(
        new ComplianceIssue(
          IssueType.TONE,
          IssueSeverity.LOW,
          `Content doesn't clearly express the brand's primary tone: ${brand.toneGuidelines.primaryTone}`,
          `Consider incorporating more ${brand.toneGuidelines.primaryTone} language`,
          context
        )
      );
    }

    return issues;
  }

  private checkVoiceCompliance(content: Content, brand: Brand): ComplianceIssue[] {
    const issues: ComplianceIssue[] = [];
    const text = content.text;

    // Check contraction usage
    const hasContractions = /\b\w+'(s|re|ve|ll|d|t)\b/.test(text);
    if (brand.voiceGuidelines.usesContractions && !hasContractions && content.length > 50) {
      issues.push(
        new ComplianceIssue(
          IssueType.VOICE,
          IssueSeverity.LOW,
          'Content lacks contractions as preferred by brand voice',
          'Consider using contractions like "we\'re" instead of "we are"'
        )
      );
    } else if (!brand.voiceGuidelines.usesContractions && hasContractions) {
      issues.push(
        new ComplianceIssue(
          IssueType.VOICE,
          IssueSeverity.MEDIUM,
          'Content uses contractions which conflicts with formal brand voice',
          'Use full forms: "we are" instead of "we\'re"'
        )
      );
    }

    // Check pronoun usage
    const hasFirstPerson = /\b(we|us|our|ours)\b/i.test(text);
    const hasSecondPerson = /\b(you|your|yours)\b/i.test(text);

    if (!brand.voiceGuidelines.usesPronoun.firstPerson && hasFirstPerson) {
      issues.push(
        new ComplianceIssue(
          IssueType.VOICE,
          IssueSeverity.MEDIUM,
          'Content uses first-person pronouns contrary to brand voice guidelines',
          'Rephrase to avoid "we", "us", "our" pronouns'
        )
      );
    }

    if (!brand.voiceGuidelines.usesPronoun.secondPerson && hasSecondPerson) {
      issues.push(
        new ComplianceIssue(
          IssueType.VOICE,
          IssueSeverity.MEDIUM,
          'Content uses second-person pronouns contrary to brand voice guidelines',
          'Rephrase to avoid "you", "your" pronouns'
        )
      );
    }

    return issues;
  }

  private checkTerminologyCompliance(
    content: Content,
    brand: Brand,
    context: string
  ): ComplianceIssue[] {
    const issues: ComplianceIssue[] = [];
    const text = content.normalizedText.toLowerCase();

    // Check globally avoided terms
    for (const avoidedTerm of brand.terminologyGuidelines.avoidedGlobalTerms) {
      if (text.includes(avoidedTerm.toLowerCase()) && !this.isTermExempt(avoidedTerm, context)) {
        issues.push(
          new ComplianceIssue(
            IssueType.TERMINOLOGY,
            IssueSeverity.HIGH,
            `Content uses prohibited term: "${avoidedTerm}"`,
            'Remove or replace with brand-approved alternative',
            context
          )
        );
      }
    }

    // Check terminology rules
    for (const rule of brand.terminologyGuidelines.terms) {
      if (rule.alternatives) {
        // Check for non-preferred alternatives
        for (const alternative of rule.alternatives) {
          if (
            text.includes(alternative.toLowerCase()) &&
            (!rule.contexts || rule.contexts.includes(context))
          ) {
            issues.push(
              new ComplianceIssue(
                IssueType.TERMINOLOGY,
                IssueSeverity.MEDIUM,
                `Content uses "${alternative}" instead of preferred term "${rule.preferred}"`,
                `Replace "${alternative}" with "${rule.preferred}"`,
                context
              )
            );
          }
        }
      }

      // Check context-specific avoided terms
      if (
        rule.term &&
        rule.avoidInContexts?.includes(context) &&
        text.includes(rule.term.toLowerCase())
      ) {
        issues.push(
          new ComplianceIssue(
            IssueType.TERMINOLOGY,
            IssueSeverity.MEDIUM,
            `Term "${rule.term}" should be avoided in ${context} context`,
            rule.notes || 'Use alternative terminology for this context',
            context
          )
        );
      }
    }

    return issues;
  }

  private detectTone(text: string, tone: string): boolean {
    // Simple tone detection based on keywords and patterns
    const tonePatterns: Record<string, string[]> = {
      confident: ['proven', 'guarantee', 'ensure', 'definitely', 'certainly', 'expert'],
      friendly: ['welcome', 'glad', 'happy', 'pleased', 'enjoy', 'wonderful'],
      professional: ['professional', 'expertise', 'experience', 'qualified', 'standards'],
      casual: ['hey', 'cool', 'awesome', 'great', 'nice', 'fun'],
      authoritative: ['must', 'should', 'required', 'essential', 'critical', 'important'],
      pessimistic: ['unfortunately', 'sadly', 'difficult', 'challenging', 'problems', 'issues'],
      condescending: ['obviously', 'clearly', 'simple', 'just', 'merely', 'of course'],
    };

    const patterns = tonePatterns[tone.toLowerCase()] || [];
    return patterns.some((pattern) => text.includes(pattern.toLowerCase()));
  }

  private isTermExempt(term: string, context: string): boolean {
    // Technical terms are exempt in technical contexts
    if (this.technicalContexts.includes(context)) {
      return this.technicalTermsAllowlist.some((tech) =>
        tech.toLowerCase().includes(term.toLowerCase())
      );
    }
    return false;
  }

  private calculateComplianceScore(issues: ComplianceIssue[]): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case IssueSeverity.HIGH:
          score -= 20;
          break;
        case IssueSeverity.MEDIUM:
          score -= 10;
          break;
        case IssueSeverity.LOW:
          score -= 5;
          break;
      }
    }

    return Math.max(0, score);
  }

  private generateComplianceSummary(
    score: number,
    issues: ComplianceIssue[],
    brandName: string
  ): string {
    if (score >= 80) {
      return `Content is compliant with ${brandName} brand guidelines (${score}/100).`;
    } else if (score >= 60) {
      return `Content needs improvement to meet ${brandName} brand standards (${score}/100). ${issues.length} issues found.`;
    } else {
      return `Content has significant compliance issues with ${brandName} brand guidelines (${score}/100). Major revisions needed.`;
    }
  }
}

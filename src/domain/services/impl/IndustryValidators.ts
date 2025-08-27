/**
 * Industry-specific validators for specialized compliance requirements
 */

export abstract class IndustryValidator {
  protected readonly industryName: string;
  protected readonly regulations: string[];
  protected readonly requiredDisclosures: Map<string, string>;
  protected readonly prohibitedTerms: Map<string, string>;
  protected readonly specialRequirements: SpecialRequirement[];

  constructor(industryName: string) {
    this.industryName = industryName;
    this.regulations = [];
    this.requiredDisclosures = new Map();
    this.prohibitedTerms = new Map();
    this.specialRequirements = [];
  }

  /**
   * Validate content for industry compliance
   */
  async validate(content: string, context?: ValidationContext): Promise<IndustryValidationResult> {
    const violations: ComplianceViolation[] = [];
    const warnings: ComplianceWarning[] = [];
    const requirements: MissingRequirement[] = [];

    // Check prohibited terms
    const termViolations = this.checkProhibitedTerms(content);
    violations.push(...termViolations);

    // Check required disclosures
    const missingDisclosures = this.checkRequiredDisclosures(content, context);
    requirements.push(...missingDisclosures);

    // Check special requirements
    const specialViolations = await this.checkSpecialRequirements(content, context);
    violations.push(...specialViolations.violations);
    warnings.push(...specialViolations.warnings);

    // Industry-specific checks
    const industrySpecific = await this.performIndustrySpecificChecks(content, context);
    violations.push(...industrySpecific.violations);
    warnings.push(...industrySpecific.warnings);
    requirements.push(...industrySpecific.requirements);

    // Calculate compliance score
    const score = this.calculateComplianceScore(violations, warnings, requirements);

    return {
      industry: this.industryName,
      isCompliant: violations.length === 0 && requirements.length === 0,
      score,
      violations,
      warnings,
      requirements,
      regulations: this.regulations,
      recommendations: this.generateRecommendations(violations, warnings, requirements)
    };
  }

  /**
   * Check for prohibited terms
   */
  protected checkProhibitedTerms(content: string): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    
    for (const [term, reason] of this.prohibitedTerms) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = content.match(regex);
      
      if (matches) {
        violations.push({
          type: 'prohibited_term',
          severity: 'high',
          description: `Prohibited term "${term}" found`,
          reason,
          occurrences: matches.length,
          regulation: this.getRelevantRegulation(term)
        });
      }
    }

    return violations;
  }

  /**
   * Check for required disclosures
   */
  protected checkRequiredDisclosures(
    content: string, 
    context?: ValidationContext
  ): MissingRequirement[] {
    const missing: MissingRequirement[] = [];

    for (const [disclosure, requirement] of this.requiredDisclosures) {
      if (this.isDisclosureRequired(disclosure, content, context)) {
        const hasDisclosure = this.hasDisclosure(content, disclosure);
        
        if (!hasDisclosure) {
          missing.push({
            type: 'disclosure',
            requirement,
            template: this.getDisclosureTemplate(disclosure),
            regulation: this.getRelevantRegulation(disclosure)
          });
        }
      }
    }

    return missing;
  }

  /**
   * Check special industry requirements
   */
  protected async checkSpecialRequirements(
    content: string,
    context?: ValidationContext
  ): Promise<{ violations: ComplianceViolation[], warnings: ComplianceWarning[] }> {
    const violations: ComplianceViolation[] = [];
    const warnings: ComplianceWarning[] = [];

    for (const requirement of this.specialRequirements) {
      const result = await requirement.check(content, context);
      
      if (!result.passed) {
        if (result.severity === 'violation') {
          violations.push({
            type: 'special_requirement',
            severity: 'high',
            description: result.message,
            reason: requirement.reason,
            regulation: requirement.regulation
          });
        } else {
          warnings.push({
            type: 'special_requirement',
            message: result.message,
            recommendation: result.recommendation
          });
        }
      }
    }

    return { violations, warnings };
  }

  /**
   * Calculate compliance score
   */
  protected calculateComplianceScore(
    violations: ComplianceViolation[],
    warnings: ComplianceWarning[],
    requirements: MissingRequirement[]
  ): number {
    let score = 100;

    // Deduct for violations
    violations.forEach(v => {
      score -= v.severity === 'critical' ? 30 : 
               v.severity === 'high' ? 20 : 10;
    });

    // Deduct for missing requirements
    score -= requirements.length * 15;

    // Deduct for warnings
    score -= warnings.length * 5;

    return Math.max(0, score);
  }

  /**
   * Generate recommendations
   */
  protected generateRecommendations(
    violations: ComplianceViolation[],
    warnings: ComplianceWarning[],
    requirements: MissingRequirement[]
  ): string[] {
    const recommendations: string[] = [];

    if (violations.length > 0) {
      recommendations.push('Remove or replace prohibited terms');
    }

    if (requirements.length > 0) {
      recommendations.push('Add required disclosures');
    }

    if (warnings.length > 0) {
      recommendations.push('Review and address compliance warnings');
    }

    return recommendations;
  }

  /**
   * Abstract methods to be implemented by specific validators
   */
  protected abstract performIndustrySpecificChecks(
    content: string,
    context?: ValidationContext
  ): Promise<{
    violations: ComplianceViolation[],
    warnings: ComplianceWarning[],
    requirements: MissingRequirement[]
  }>;

  protected abstract isDisclosureRequired(
    disclosure: string,
    content: string,
    context?: ValidationContext
  ): boolean;

  protected abstract hasDisclosure(content: string, disclosure: string): boolean;
  protected abstract getDisclosureTemplate(disclosure: string): string;
  protected abstract getRelevantRegulation(term: string): string;
}

/**
 * Financial Services Validator
 */
export class FinancialServicesValidator extends IndustryValidator {
  constructor() {
    super('Financial Services');
    this.initializeFinancialRules();
  }

  private initializeFinancialRules(): void {
    // Regulations
    this.regulations.push(
      'SEC Rule 206(4)-1',
      'FINRA Rule 2210',
      'Regulation Z (Truth in Lending)',
      'MiFID II',
      'Dodd-Frank Act'
    );

    // Prohibited terms
    this.prohibitedTerms.set('guaranteed returns', 'SEC prohibits guarantees of investment performance');
    this.prohibitedTerms.set('risk-free', 'All investments carry risk');
    this.prohibitedTerms.set('sure thing', 'Misleading investment claim');
    this.prohibitedTerms.set('can\'t lose', 'False security claim');
    this.prohibitedTerms.set('bank guarantee', 'Requires specific authorization');

    // Required disclosures
    this.requiredDisclosures.set('investment_risk', 'Past performance does not guarantee future results');
    this.requiredDisclosures.set('fdic', 'FDIC insurance disclosure when mentioning deposits');
    this.requiredDisclosures.set('apr', 'Annual Percentage Rate disclosure for loans');
    this.requiredDisclosures.set('fees', 'Clear disclosure of all fees and charges');

    // Special requirements
    this.specialRequirements.push({
      name: 'balanced_presentation',
      check: async (content: string) => {
        const hasPositive = /\b(profit|gain|return|growth)\b/gi.test(content);
        const hasRisk = /\b(risk|loss|volatility|uncertainty)\b/gi.test(content);
        
        if (hasPositive && !hasRisk) {
          return {
            passed: false,
            severity: 'violation',
            message: 'Investment content must present balanced view of risks and benefits',
            recommendation: 'Add risk disclosure alongside benefit claims'
          };
        }
        return { passed: true };
      },
      reason: 'FINRA requires balanced presentation',
      regulation: 'FINRA Rule 2210'
    });
  }

  protected async performIndustrySpecificChecks(
    content: string,
    context?: ValidationContext
  ) {
    const violations: ComplianceViolation[] = [];
    const warnings: ComplianceWarning[] = [];
    const requirements: MissingRequirement[] = [];

    // Check for testimonials without disclosure
    if (/\b(testimonial|endorsement|review from)\b/gi.test(content)) {
      if (!/\b(past performance|not guarantee|individual results)\b/gi.test(content)) {
        requirements.push({
          type: 'disclosure',
          requirement: 'Testimonial disclosure required',
          template: 'Individual results may vary. Past performance is not indicative of future results.',
          regulation: 'SEC Rule 206(4)-1'
        });
      }
    }

    // Check for specific percentage claims
    const percentageMatch = content.match(/\d+(\.\d+)?%\s*(return|yield|apr|apy|interest)/gi);
    if (percentageMatch) {
      if (!/\b(annual|yearly|monthly|daily)\b/gi.test(content)) {
        warnings.push({
          type: 'clarity',
          message: 'Percentage rates should specify time period',
          recommendation: 'Clarify if rate is annual, monthly, etc.'
        });
      }
    }

    return { violations, warnings, requirements };
  }

  protected isDisclosureRequired(
    disclosure: string,
    content: string,
    context?: ValidationContext
  ): boolean {
    switch (disclosure) {
      case 'investment_risk':
        return /\b(invest|portfolio|returns?|yield|dividend)\b/gi.test(content);
      case 'fdic':
        return /\b(deposit|savings|checking|bank account)\b/gi.test(content);
      case 'apr':
        return /\b(loan|credit|borrow|finance|mortgage)\b/gi.test(content);
      case 'fees':
        return /\b(fee|charge|cost|expense|commission)\b/gi.test(content);
      default:
        return false;
    }
  }

  protected hasDisclosure(content: string, disclosure: string): boolean {
    const disclosurePatterns: Record<string, RegExp> = {
      'investment_risk': /past performance.*not.*guarantee|risk.*loss.*principal/gi,
      'fdic': /FDIC insured|member FDIC|Federal Deposit Insurance/gi,
      'apr': /annual percentage rate|APR/gi,
      'fees': /fee schedule|charges may apply|see.*fees/gi
    };

    return disclosurePatterns[disclosure]?.test(content) || false;
  }

  protected getDisclosureTemplate(disclosure: string): string {
    const templates: Record<string, string> = {
      'investment_risk': 'Past performance is not a guarantee of future results. All investments involve risk, including possible loss of principal.',
      'fdic': 'Member FDIC. Deposits insured up to $250,000 per depositor.',
      'apr': 'See terms for Annual Percentage Rate (APR) details.',
      'fees': 'Fees may apply. See fee schedule for details.'
    };

    return templates[disclosure] || '';
  }

  protected getRelevantRegulation(term: string): string {
    if (term.includes('return') || term.includes('guarantee')) return 'SEC Rule 206(4)-1';
    if (term.includes('fdic') || term.includes('deposit')) return 'Federal Deposit Insurance Act';
    if (term.includes('apr') || term.includes('loan')) return 'Regulation Z';
    return 'FINRA Rule 2210';
  }
}

/**
 * Healthcare Validator
 */
export class HealthcareValidator extends IndustryValidator {
  constructor() {
    super('Healthcare');
    this.initializeHealthcareRules();
  }

  private initializeHealthcareRules(): void {
    // Regulations
    this.regulations.push(
      'FDA Regulations',
      'FTC Health Claims',
      'HIPAA Privacy Rule',
      'Medicare Marketing Guidelines',
      'EU MDR (Medical Device Regulation)'
    );

    // Prohibited terms
    this.prohibitedTerms.set('cure', 'Unsubstantiated medical claim');
    this.prohibitedTerms.set('miracle', 'Misleading health claim');
    this.prohibitedTerms.set('breakthrough', 'Requires FDA approval');
    this.prohibitedTerms.set('FDA approved', 'Cannot claim without authorization');
    this.prohibitedTerms.set('scientifically proven', 'Requires peer-reviewed evidence');

    // Required disclosures
    this.requiredDisclosures.set('medical_advice', 'Not a substitute for professional medical advice');
    this.requiredDisclosures.set('results', 'Individual results may vary');
    this.requiredDisclosures.set('side_effects', 'See full list of side effects');
    this.requiredDisclosures.set('dietary_supplement', 'These statements have not been evaluated by the FDA');

    // Special requirements
    this.specialRequirements.push({
      name: 'evidence_based_claims',
      check: async (content: string) => {
        const medicalClaims = /\b(treats?|prevents?|cures?|heals?|eliminates?)\s+\w+/gi;
        const hasEvidence = /\b(study|studies|research|clinical trial|evidence)\b/gi;
        
        if (medicalClaims.test(content) && !hasEvidence.test(content)) {
          return {
            passed: false,
            severity: 'violation',
            message: 'Medical claims must be supported by evidence',
            recommendation: 'Add references to clinical studies or remove claims'
          };
        }
        return { passed: true };
      },
      reason: 'FTC requires substantiation for health claims',
      regulation: 'FTC Health Claims Guide'
    });
  }

  protected async performIndustrySpecificChecks(
    content: string,
    context?: ValidationContext
  ) {
    const violations: ComplianceViolation[] = [];
    const warnings: ComplianceWarning[] = [];
    const requirements: MissingRequirement[] = [];

    // Check for disease claims without disclaimer
    const diseases = /\b(cancer|diabetes|heart disease|alzheimer|covid|corona)/gi;
    if (diseases.test(content)) {
      if (!/\b(consult.*doctor|medical advice|healthcare provider)\b/gi.test(content)) {
        requirements.push({
          type: 'disclosure',
          requirement: 'Medical disclaimer required when discussing diseases',
          template: 'This information is not intended to diagnose, treat, cure, or prevent any disease. Consult your healthcare provider.',
          regulation: 'FDA Regulations'
        });
      }
    }

    // Check for supplement claims
    if (/\b(supplement|vitamin|mineral|herb|extract)\b/gi.test(content)) {
      if (!/FDA.*evaluated|not been evaluated/gi.test(content)) {
        requirements.push({
          type: 'disclosure',
          requirement: 'Dietary supplement disclaimer required',
          template: 'These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.',
          regulation: 'DSHEA'
        });
      }
    }

    return { violations, warnings, requirements };
  }

  protected isDisclosureRequired(
    disclosure: string,
    content: string,
    context?: ValidationContext
  ): boolean {
    switch (disclosure) {
      case 'medical_advice':
        return /\b(treatment|therapy|medication|diagnosis)\b/gi.test(content);
      case 'results':
        return /\b(results?|outcome|effective|success rate)\b/gi.test(content);
      case 'side_effects':
        return /\b(medication|drug|treatment|therapy)\b/gi.test(content);
      case 'dietary_supplement':
        return /\b(supplement|vitamin|mineral|herb)\b/gi.test(content);
      default:
        return false;
    }
  }

  protected hasDisclosure(content: string, disclosure: string): boolean {
    const disclosurePatterns: Record<string, RegExp> = {
      'medical_advice': /not.*substitute.*medical advice|consult.*doctor|healthcare provider/gi,
      'results': /individual results|results may vary|not typical/gi,
      'side_effects': /side effects|adverse reactions|contraindications/gi,
      'dietary_supplement': /not.*evaluated.*FDA|statements.*not.*evaluated/gi
    };

    return disclosurePatterns[disclosure]?.test(content) || false;
  }

  protected getDisclosureTemplate(disclosure: string): string {
    const templates: Record<string, string> = {
      'medical_advice': 'This information is not a substitute for professional medical advice, diagnosis, or treatment.',
      'results': 'Individual results may vary. Results not typical.',
      'side_effects': 'May cause side effects. See full prescribing information.',
      'dietary_supplement': 'These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.'
    };

    return templates[disclosure] || '';
  }

  protected getRelevantRegulation(term: string): string {
    if (term.includes('FDA') || term.includes('approved')) return 'FDA Regulations';
    if (term.includes('cure') || term.includes('treatment')) return 'FTC Health Claims';
    if (term.includes('privacy') || term.includes('patient')) return 'HIPAA Privacy Rule';
    return 'FTC Act Section 5';
  }
}

/**
 * Legal Services Validator
 */
export class LegalServicesValidator extends IndustryValidator {
  constructor() {
    super('Legal Services');
    this.initializeLegalRules();
  }

  private initializeLegalRules(): void {
    // Regulations
    this.regulations.push(
      'ABA Model Rules of Professional Conduct',
      'State Bar Ethics Rules',
      'Attorney Advertising Regulations'
    );

    // Prohibited terms
    this.prohibitedTerms.set('guarantee', 'Cannot guarantee legal outcomes');
    this.prohibitedTerms.set('best lawyer', 'Unverifiable claim');
    this.prohibitedTerms.set('expert', 'Requires specific certification');
    this.prohibitedTerms.set('specialist', 'Requires state bar certification');

    // Required disclosures
    this.requiredDisclosures.set('attorney_advertising', 'Attorney Advertising');
    this.requiredDisclosures.set('no_attorney_client', 'No attorney-client relationship formed');
    this.requiredDisclosures.set('prior_results', 'Prior results do not guarantee similar outcome');

    this.specialRequirements.push({
      name: 'confidentiality_warning',
      check: async (content: string) => {
        const hasContactForm = /\b(contact|email|call|message) us\b/gi.test(content);
        const hasConfidentialityWarning = /\b(confidential|privileged|attorney-client)\b/gi.test(content);
        
        if (hasContactForm && !hasConfidentialityWarning) {
          return {
            passed: false,
            severity: 'warning',
            message: 'Contact forms should warn about confidentiality',
            recommendation: 'Add warning about not sending confidential information'
          };
        }
        return { passed: true };
      },
      reason: 'Ethics rules on confidentiality',
      regulation: 'ABA Model Rule 1.6'
    });
  }

  protected async performIndustrySpecificChecks(
    content: string,
    context?: ValidationContext
  ) {
    const violations: ComplianceViolation[] = [];
    const warnings: ComplianceWarning[] = [];
    const requirements: MissingRequirement[] = [];

    // Check for case results without disclaimer
    if (/\$([\d,]+)|million|verdict|settlement/gi.test(content)) {
      if (!/prior results|past results|not guarantee/gi.test(content)) {
        requirements.push({
          type: 'disclosure',
          requirement: 'Prior results disclaimer required',
          template: 'Prior results do not guarantee a similar outcome.',
          regulation: 'ABA Model Rule 7.1'
        });
      }
    }

    return { violations, warnings, requirements };
  }

  protected isDisclosureRequired(
    disclosure: string,
    content: string,
    context?: ValidationContext
  ): boolean {
    switch (disclosure) {
      case 'attorney_advertising':
        return true; // Always required for legal marketing
      case 'no_attorney_client':
        return /\b(advice|legal information|consultation)\b/gi.test(content);
      case 'prior_results':
        return /\b(won|verdict|settlement|success|track record)\b/gi.test(content);
      default:
        return false;
    }
  }

  protected hasDisclosure(content: string, disclosure: string): boolean {
    const disclosurePatterns: Record<string, RegExp> = {
      'attorney_advertising': /attorney advertising|advertisement/gi,
      'no_attorney_client': /no attorney.client relationship|not legal advice/gi,
      'prior_results': /prior results.*not guarantee|past results/gi
    };

    return disclosurePatterns[disclosure]?.test(content) || false;
  }

  protected getDisclosureTemplate(disclosure: string): string {
    const templates: Record<string, string> = {
      'attorney_advertising': 'Attorney Advertising',
      'no_attorney_client': 'This information does not create an attorney-client relationship.',
      'prior_results': 'Prior results do not guarantee a similar outcome.'
    };

    return templates[disclosure] || '';
  }

  protected getRelevantRegulation(term: string): string {
    return 'ABA Model Rules of Professional Conduct';
  }
}

/**
 * Types and interfaces
 */
export interface ValidationContext {
  contentType?: string;
  targetAudience?: string;
  medium?: string;
  jurisdiction?: string;
}

export interface IndustryValidationResult {
  industry: string;
  isCompliant: boolean;
  score: number;
  violations: ComplianceViolation[];
  warnings: ComplianceWarning[];
  requirements: MissingRequirement[];
  regulations: string[];
  recommendations: string[];
}

export interface ComplianceViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  reason: string;
  occurrences?: number;
  regulation: string;
}

export interface ComplianceWarning {
  type: string;
  message: string;
  recommendation: string;
}

export interface MissingRequirement {
  type: string;
  requirement: string;
  template: string;
  regulation: string;
}

export interface SpecialRequirement {
  name: string;
  check: (content: string, context?: ValidationContext) => Promise<{
    passed: boolean;
    severity?: 'warning' | 'violation';
    message?: string;
    recommendation?: string;
  }>;
  reason: string;
  regulation: string;
}

/**
 * Factory for creating industry validators
 */
export class IndustryValidatorFactory {
  private static validators = new Map<string, IndustryValidator>();

  static {
    this.validators.set('financial', new FinancialServicesValidator());
    this.validators.set('healthcare', new HealthcareValidator());
    this.validators.set('legal', new LegalServicesValidator());
  }

  static getValidator(industry: string): IndustryValidator | null {
    return this.validators.get(industry.toLowerCase()) || null;
  }

  static getAllIndustries(): string[] {
    return Array.from(this.validators.keys());
  }

  static registerValidator(key: string, validator: IndustryValidator): void {
    this.validators.set(key.toLowerCase(), validator);
  }
}
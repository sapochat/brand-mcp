import { BrandSchema } from '../types/brandSchema.js';

/**
 * Service responsible for analyzing terminology usage in content
 */
export class TerminologyAnalysisService {
  private brandSchema: BrandSchema | null = null;
  private technicalTerms: Set<string> = new Set([
    'api', 'sdk', 'authentication', 'authorization', 'deployment',
    'infrastructure', 'algorithm', 'database', 'server', 'client',
    'frontend', 'backend', 'framework', 'library', 'module',
    'function', 'method', 'variable', 'constant', 'parameter'
  ]);
  private domainExemptions: Map<string, Set<string>> = new Map();
  
  constructor(brandSchema?: BrandSchema) {
    if (brandSchema) {
      this.brandSchema = brandSchema;
    }
    this.initializeDomainExemptions();
  }
  
  /**
   * Initialize domain-specific exemptions
   */
  private initializeDomainExemptions(): void {
    this.domainExemptions.set('technical', new Set([
      'leverage', 'synergy', 'algorithm', 'infrastructure'
    ]));
    this.domainExemptions.set('marketing', new Set([
      'revolutionary', 'disruptive', 'transform'
    ]));
    this.domainExemptions.set('legal', new Set([
      'whereas', 'heretofore', 'pursuant'
    ]));
  }
  
  /**
   * Set or update the brand schema
   */
  setBrandSchema(schema: BrandSchema): void {
    this.brandSchema = schema;
  }
  
  /**
   * Add technical terms to the exemption list
   */
  addTechnicalTerms(terms: string[]): void {
    terms.forEach(term => this.technicalTerms.add(term.toLowerCase()));
  }
  
  /**
   * Add domain-specific exemptions
   */
  addDomainExemptions(domain: string, terms: string[]): void {
    const existing = this.domainExemptions.get(domain) || new Set();
    terms.forEach(term => existing.add(term.toLowerCase()));
    this.domainExemptions.set(domain, existing);
  }
  
  /**
   * Analyze terminology usage in content
   */
  analyzeTerminology(content: string, context?: string): TerminologyAnalysisResult {
    if (!this.brandSchema || !this.brandSchema.terminologyGuidelines) {
      return {
        avoidedTermsFound: [],
        preferredTermsMissed: [],
        properNounIssues: [],
        terminologyScore: 100,
        issues: []
      };
    }
    
    const contentLower = content.toLowerCase();
    const guidelines = this.brandSchema.terminologyGuidelines;
    const issues: string[] = [];
    let terminologyScore = 100;
    
    // Check for avoided global terms
    const avoidedTermsFound = this.checkAvoidedTerms(content, guidelines, context);
    avoidedTermsFound.forEach(term => {
      terminologyScore -= 15;
      issues.push(`Found avoided term: "${term.term}" ${term.location ? `at position ${term.location}` : ''}`);
    });
    
    // Check for preferred terms
    const preferredTermsMissed = this.checkPreferredTerms(content, guidelines, context);
    preferredTermsMissed.forEach(issue => {
      terminologyScore -= 10;
      issues.push(issue);
    });
    
    // Check proper nouns
    const properNounIssues = this.checkProperNouns(content, guidelines);
    properNounIssues.forEach(issue => {
      terminologyScore -= 5;
      issues.push(issue);
    });
    
    // Apply context-specific rules
    const contextRules = this.getContextTerminologyRules(context, guidelines);
    if (contextRules.length > 0) {
      contextRules.forEach(rule => {
        if (rule.violated) {
          terminologyScore -= 10;
          issues.push(rule.issue);
        }
      });
    }
    
    return {
      avoidedTermsFound,
      preferredTermsMissed,
      properNounIssues,
      contextRules,
      terminologyScore: Math.max(0, terminologyScore),
      issues
    };
  }
  
  /**
   * Check for avoided terms
   */
  private checkAvoidedTerms(
    content: string, 
    guidelines: any, 
    context?: string
  ): FoundTerm[] {
    const foundTerms: FoundTerm[] = [];
    const contentLower = content.toLowerCase();
    
    // Check global avoided terms
    if (guidelines.avoidedGlobalTerms) {
      guidelines.avoidedGlobalTerms.forEach((term: string) => {
        const termLower = term.toLowerCase();
        
        // Skip if term is exempted in this context
        if (this.isTermExempted(termLower, context)) {
          return;
        }
        
        // Use word boundary regex for accurate matching
        const regex = new RegExp(`\\b${this.escapeRegex(termLower)}\\b`, 'gi');
        const matches = content.match(regex);
        
        if (matches && matches.length > 0) {
          foundTerms.push({
            term: matches[0],
            location: content.indexOf(matches[0]),
            count: matches.length
          });
        }
      });
    }
    
    // Check context-specific avoided terms
    if (guidelines.terms && context) {
      guidelines.terms.forEach((termRule: any) => {
        if (termRule.term && termRule.avoidInContexts?.includes(context)) {
          const termLower = termRule.term.toLowerCase();
          const regex = new RegExp(`\\b${this.escapeRegex(termLower)}\\b`, 'gi');
          const matches = content.match(regex);
          
          if (matches && matches.length > 0) {
            foundTerms.push({
              term: matches[0],
              location: content.indexOf(matches[0]),
              count: matches.length,
              context: `Avoided in ${context} context`
            });
          }
        }
      });
    }
    
    return foundTerms;
  }
  
  /**
   * Check for preferred terms usage
   */
  private checkPreferredTerms(
    content: string, 
    guidelines: any, 
    context?: string
  ): string[] {
    const issues: string[] = [];
    
    if (!guidelines.terms) {
      return issues;
    }
    
    guidelines.terms.forEach((termRule: any) => {
      if (termRule.preferred && termRule.alternatives) {
        // Check if this rule applies to the current context
        if (termRule.contexts && context && !termRule.contexts.includes(context)) {
          return;
        }
        
        const preferredLower = termRule.preferred.toLowerCase();
        const contentLower = content.toLowerCase();
        
        // Check if any alternatives are used instead of preferred term
        termRule.alternatives.forEach((alternative: string) => {
          const altLower = alternative.toLowerCase();
          const altRegex = new RegExp(`\\b${this.escapeRegex(altLower)}\\b`, 'gi');
          
          if (altRegex.test(content)) {
            // Check if preferred term is also present
            const prefRegex = new RegExp(`\\b${this.escapeRegex(preferredLower)}\\b`, 'gi');
            if (!prefRegex.test(content)) {
              issues.push(`Use "${termRule.preferred}" instead of "${alternative}"`);
            }
          }
        });
      }
    });
    
    return issues;
  }
  
  /**
   * Check proper noun formatting
   */
  private checkProperNouns(content: string, guidelines: any): string[] {
    const issues: string[] = [];
    
    if (!guidelines.properNouns) {
      return issues;
    }
    
    // Check product names
    if (guidelines.properNouns.productNames) {
      const expectedFormat = guidelines.properNouns.productNames;
      // This is a simplified check - in production, you'd have a list of actual product names
      const productNamePattern = /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g;
      const matches = content.match(productNamePattern) || [];
      
      matches.forEach(match => {
        if (!this.matchesExpectedFormat(match, expectedFormat)) {
          issues.push(`Product name "${match}" may not follow the expected format: ${expectedFormat}`);
        }
      });
    }
    
    // Check company name
    if (guidelines.properNouns.companyName) {
      const companyName = guidelines.properNouns.companyName;
      const companyRegex = new RegExp(`\\b${this.escapeRegex(companyName)}\\b`, 'g');
      
      // Check for incorrect variations
      const incorrectVariations = this.findIncorrectVariations(content, companyName);
      incorrectVariations.forEach(variation => {
        issues.push(`Found incorrect company name variation: "${variation}" (should be "${companyName}")`);
      });
    }
    
    return issues;
  }
  
  /**
   * Get context-specific terminology rules
   */
  private getContextTerminologyRules(context: string | undefined, guidelines: any): ContextRule[] {
    const rules: ContextRule[] = [];
    
    if (!context || !guidelines.terms) {
      return rules;
    }
    
    // Check for terms that have context-specific rules
    guidelines.terms.forEach((termRule: any) => {
      if (termRule.contexts && termRule.contexts.includes(context)) {
        // This term has specific rules for this context
        rules.push({
          term: termRule.preferred || termRule.term,
          context,
          violated: false,
          issue: ''
        });
      }
    });
    
    return rules;
  }
  
  /**
   * Check if a term is exempted in the given context
   */
  private isTermExempted(term: string, context?: string): boolean {
    // Check if it's a technical term in technical context
    if (context?.includes('technical') && this.technicalTerms.has(term)) {
      return true;
    }
    
    // Check domain-specific exemptions
    if (context) {
      const domainExempts = this.domainExemptions.get(context);
      if (domainExempts?.has(term)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Check if a string matches the expected format
   */
  private matchesExpectedFormat(str: string, format: string): boolean {
    // Simple format checking - can be expanded
    if (format.includes('capitalized')) {
      return /^[A-Z]/.test(str);
    }
    if (format.includes('no spaces')) {
      return !str.includes(' ');
    }
    return true;
  }
  
  /**
   * Find incorrect variations of a proper noun
   */
  private findIncorrectVariations(content: string, correctName: string): string[] {
    const variations: string[] = [];
    const nameParts = correctName.split(/\s+/);
    
    // Look for common variations
    const patterns = [
      new RegExp(`\\b${nameParts.join('\\s*')}\\b`, 'gi'), // Extra spaces
      new RegExp(`\\b${nameParts.join('-')}\\b`, 'gi'), // Hyphenated
      new RegExp(`\\b${nameParts.join('_')}\\b`, 'gi'), // Underscored
    ];
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(match => {
        if (match !== correctName) {
          variations.push(match);
        }
      });
    });
    
    return variations;
  }
}

/**
 * Found term information
 */
export interface FoundTerm {
  term: string;
  location?: number;
  count?: number;
  context?: string;
}

/**
 * Context-specific rule
 */
export interface ContextRule {
  term: string;
  context: string;
  violated: boolean;
  issue: string;
}

/**
 * Result of terminology analysis
 */
export interface TerminologyAnalysisResult {
  avoidedTermsFound: FoundTerm[];
  preferredTermsMissed: string[];
  properNounIssues: string[];
  contextRules?: ContextRule[];
  terminologyScore: number;
  issues: string[];
}
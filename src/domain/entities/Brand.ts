/**
 * Domain entity representing a brand and its guidelines
 */
export class Brand {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly toneGuidelines: ToneGuidelines,
    public readonly voiceGuidelines: VoiceGuidelines,
    public readonly terminologyGuidelines: TerminologyGuidelines,
    public readonly visualIdentity?: VisualIdentity,
    public readonly contextualAdjustments?: readonly ContextualAdjustment[]
  ) {
    if (!name || name.trim().length === 0) {
      throw new Error('Brand name cannot be empty');
    }
  }
}

/**
 * Brand schema interface for loading from external sources
 */
export interface BrandSchema {
  readonly name: string;
  readonly description: string;
  readonly toneGuidelines: ToneGuidelines;
  readonly voiceGuidelines: VoiceGuidelines;
  readonly terminologyGuidelines: TerminologyGuidelines;
  readonly visualIdentity?: VisualIdentity;
  readonly contextualAdjustments?: readonly ContextualAdjustment[];
  readonly contextualVisualRules?: readonly ContextualVisualRule[];
}

export interface ToneGuidelines {
  readonly primaryTone: string;
  readonly secondaryTones: readonly string[];
  readonly avoidedTones: readonly string[];
  readonly tonalShift: Record<string, string>;
  readonly examples: Record<string, string>;
}

export interface VoiceGuidelines {
  readonly personality: string;
  readonly sentence: {
    readonly length: string;
    readonly structure: string;
  };
  readonly usesContractions: boolean;
  readonly usesPronoun: {
    readonly firstPerson: boolean;
    readonly secondPerson: boolean;
  };
  readonly examples: Record<string, string>;
}

export interface TerminologyGuidelines {
  readonly avoidedGlobalTerms: readonly string[];
  readonly properNouns: Record<string, string>;
  readonly terms: readonly TerminologyRule[];
}

export interface TerminologyRule {
  readonly preferred?: string;
  readonly alternatives?: readonly string[];
  readonly term?: string;
  readonly contexts?: readonly string[];
  readonly avoidInContexts?: readonly string[];
  readonly notes?: string;
}

export interface VisualIdentity {
  readonly colors: {
    readonly primary: readonly string[];
    readonly secondary: readonly string[];
    readonly forbidden: readonly string[];
  };
  readonly typography: {
    readonly headingFont: string;
    readonly bodyFont: string;
    readonly fontSizes: Record<string, any>;
  };
  readonly imagery: {
    readonly style: string;
    readonly subjects: readonly string[];
    readonly avoidedSubjects: readonly string[];
  };
  readonly layout: {
    readonly preferences: string;
    readonly gridSystem?: string;
  };
}

export interface ContextualAdjustment {
  readonly contexts: readonly string[];
  readonly applyRules: {
    readonly tone?: string;
    readonly voice?: Partial<VoiceGuidelines>;
  };
}

export interface ContextualVisualRule {
  readonly contexts: readonly string[];
  readonly applyRules: {
    readonly imagery?: Partial<VisualIdentity['imagery']> & { notes?: string };
    readonly typography?: Partial<VisualIdentity['typography']> & { notes?: string };
    readonly colors?: { notes?: string };
    readonly layout?: Partial<VisualIdentity['layout']> & { notes?: string };
  };
}
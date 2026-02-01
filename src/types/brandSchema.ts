// Brand Schema Types
export interface BrandSchema {
  name: string;
  description: string;

  toneGuidelines: {
    primaryTone: string;
    secondaryTones: string[];
    avoidedTones: string[];
    tonalShift: Record<string, string>;
    examples: Record<string, string>;
  };

  voiceGuidelines: {
    personality: string;
    sentence: {
      length: string;
      structure: string;
    };
    usesContractions: boolean;
    usesPronoun: {
      firstPerson: boolean;
      secondPerson: boolean;
    };
    examples: Record<string, string>;
  };

  visualIdentity: {
    colors: {
      primary: string[];
      secondary: string[];
      forbidden: string[];
    };
    typography: {
      headingFont: string;
      bodyFont: string;
      fontSizes: Record<string, string | number>;
    };
    imagery: {
      style: string;
      subjects: string[];
      avoidedSubjects: string[];
    };
    layout: {
      preferences: string;
      gridSystem?: string;
    };
  };

  contextualVisualRules: Array<{
    contexts: string[];
    applyRules: {
      colors?: {
        primary?: string[];
        secondary?: string[];
        notes?: string;
      };
      typography?: {
        headingFont?: string;
        bodyFont?: string;
        notes?: string;
      };
      imagery?: {
        style?: string;
        subjects?: string[];
        notes?: string;
      };
      layout?: {
        preferences?: string;
        notes?: string;
      };
    };
  }>;

  terminologyGuidelines: {
    avoidedGlobalTerms: string[];
    properNouns: Record<string, string>;
    terms: Array<{
      preferred?: string;
      alternatives?: string[];
      term?: string;
      contexts?: string[];
      avoidInContexts?: string[];
      notes?: string;
    }>;
  };

  contextualAdjustments: Array<{
    contexts: string[];
    applyRules: {
      tone?: string;
      voice?: {
        personality?: string;
        sentenceLength?: string;
        sentenceStructure?: string;
        usesContractions?: boolean;
      };
    };
  }>;
}

// Brand compliance issues
export interface BrandComplianceIssue {
  type: 'tone' | 'voice' | 'terminology' | 'visual';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}

// Brand compliance result
export interface BrandComplianceResult {
  content: string;
  isCompliant: boolean;
  complianceScore: number; // 0-100
  issues: BrandComplianceIssue[];
  summary: string;
  timestamp: string;
  brandName: string;
  context?: string;
  contentType?: string;
}

/**
 * Interface for context-aware content validation
 * Validates content based on contextual understanding and situational awareness
 */
export interface ContextAwareValidator {
  /**
   * Validate content with context awareness
   */
  validate(content: string, context: ValidationContext): Promise<ContextAwareValidationResult>;

  /**
   * Check if content is appropriate for context
   */
  isAppropriate(content: string, context: ValidationContext): Promise<boolean>;

  /**
   * Get context-specific requirements
   */
  getContextRequirements(context: ValidationContext): Promise<ContextRequirements>;

  /**
   * Suggest content improvements for context
   */
  suggestImprovements(content: string, context: ValidationContext): Promise<ContentImprovement[]>;
}

/**
 * Validation context information
 */
export interface ValidationContext {
  /**
   * Type of communication channel
   */
  channel: CommunicationChannel;

  /**
   * Target audience
   */
  audience: AudienceProfile;

  /**
   * Purpose of the content
   */
  purpose: ContentPurpose;

  /**
   * Industry or domain
   */
  industry?: Industry;

  /**
   * Geographic region
   */
  region?: GeographicRegion;

  /**
   * Time-based context
   */
  temporal?: TemporalContext;

  /**
   * Platform-specific constraints
   */
  platform?: PlatformContext;

  /**
   * Regulatory requirements
   */
  regulatory?: RegulatoryContext;

  /**
   * Brand voice guidelines
   */
  brandVoice?: BrandVoiceProfile;

  /**
   * Cultural considerations
   */
  cultural?: CulturalContext;
}

/**
 * Context-aware validation result
 */
export interface ContextAwareValidationResult {
  /**
   * Is content valid for context
   */
  isValid: boolean;

  /**
   * Context appropriateness score (0-100)
   */
  appropriatenessScore: number;

  /**
   * Detected violations
   */
  violations: ContextViolation[];

  /**
   * Warnings about potential issues
   */
  warnings: ContextWarning[];

  /**
   * Context-specific recommendations
   */
  recommendations: ContextRecommendation[];

  /**
   * Audience alignment analysis
   */
  audienceAlignment: AudienceAlignment;

  /**
   * Platform compliance
   */
  platformCompliance: PlatformCompliance;

  /**
   * Cultural sensitivity analysis
   */
  culturalSensitivity: CulturalSensitivityResult;

  /**
   * Regulatory compliance
   */
  regulatoryCompliance?: RegulatoryComplianceResult;

  /**
   * Overall confidence in validation
   */
  confidence: number;
}

/**
 * Communication channel types
 */
export enum CommunicationChannel {
  EMAIL = 'email',
  SOCIAL_MEDIA = 'social_media',
  WEBSITE = 'website',
  BLOG = 'blog',
  NEWSLETTER = 'newsletter',
  PRESS_RELEASE = 'press_release',
  INTERNAL_MEMO = 'internal_memo',
  CUSTOMER_SUPPORT = 'customer_support',
  MARKETING_COPY = 'marketing_copy',
  LEGAL_DOCUMENT = 'legal_document',
  TECHNICAL_DOCUMENTATION = 'technical_documentation',
}

/**
 * Audience profile
 */
export interface AudienceProfile {
  /**
   * Primary audience type
   */
  type: AudienceType;

  /**
   * Age range
   */
  ageRange?: { min: number; max: number };

  /**
   * Education level
   */
  educationLevel?: EducationLevel;

  /**
   * Professional background
   */
  professional?: ProfessionalBackground;

  /**
   * Language preferences
   */
  languages: string[];

  /**
   * Technical proficiency
   */
  technicalLevel?: TechnicalProficiency;

  /**
   * Specific characteristics
   */
  characteristics?: string[];

  /**
   * Accessibility requirements
   */
  accessibility?: AccessibilityNeeds;
}

/**
 * Content purpose
 */
export enum ContentPurpose {
  INFORM = 'inform',
  EDUCATE = 'educate',
  SELL = 'sell',
  SUPPORT = 'support',
  ENTERTAIN = 'entertain',
  LEGAL = 'legal',
  TECHNICAL = 'technical',
  COMPLIANCE = 'compliance',
  BRAND_BUILDING = 'brand_building',
}

/**
 * Industry classification
 */
export enum Industry {
  FINANCE = 'finance',
  HEALTHCARE = 'healthcare',
  TECHNOLOGY = 'technology',
  EDUCATION = 'education',
  RETAIL = 'retail',
  MANUFACTURING = 'manufacturing',
  ENTERTAINMENT = 'entertainment',
  GOVERNMENT = 'government',
  NONPROFIT = 'nonprofit',
  LEGAL = 'legal',
}

/**
 * Geographic region
 */
export interface GeographicRegion {
  /**
   * Country code
   */
  country: string;

  /**
   * State/Province
   */
  state?: string;

  /**
   * City
   */
  city?: string;

  /**
   * Language preferences
   */
  languages: string[];

  /**
   * Timezone
   */
  timezone: string;
}

/**
 * Temporal context
 */
export interface TemporalContext {
  /**
   * Time of day relevance
   */
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';

  /**
   * Day of week relevance
   */
  dayOfWeek?: string;

  /**
   * Seasonal relevance
   */
  season?: 'spring' | 'summer' | 'fall' | 'winter';

  /**
   * Event or holiday context
   */
  event?: string;

  /**
   * Campaign timeline
   */
  campaign?: {
    start: Date;
    end: Date;
    phase: string;
  };
}

/**
 * Platform-specific context
 */
export interface PlatformContext {
  /**
   * Platform name
   */
  name: string;

  /**
   * Character limits
   */
  characterLimit?: number;

  /**
   * Supported formats
   */
  supportedFormats: string[];

  /**
   * Platform-specific rules
   */
  rules: PlatformRule[];

  /**
   * Hashtag requirements
   */
  hashtagRules?: HashtagRules;
}

/**
 * Context violation
 */
export interface ContextViolation {
  /**
   * Violation type
   */
  type: ViolationType;

  /**
   * Severity level
   */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /**
   * Description of violation
   */
  description: string;

  /**
   * Context rule violated
   */
  rule: string;

  /**
   * Location in content
   */
  position?: TextPosition;

  /**
   * Required action
   */
  requiredAction: string;
}

/**
 * Context warning
 */
export interface ContextWarning {
  /**
   * Warning type
   */
  type: string;

  /**
   * Warning message
   */
  message: string;

  /**
   * Risk level
   */
  riskLevel: 'low' | 'medium' | 'high';

  /**
   * Suggested mitigation
   */
  mitigation?: string;
}

/**
 * Context recommendation
 */
export interface ContextRecommendation {
  /**
   * Recommendation type
   */
  type: string;

  /**
   * Recommendation text
   */
  recommendation: string;

  /**
   * Expected impact
   */
  impact: string;

  /**
   * Priority level
   */
  priority: 'low' | 'medium' | 'high';

  /**
   * Implementation effort
   */
  effort: 'minimal' | 'moderate' | 'significant';
}

/**
 * Audience alignment analysis
 */
export interface AudienceAlignment {
  /**
   * Alignment score (0-100)
   */
  score: number;

  /**
   * Language appropriateness
   */
  languageMatch: boolean;

  /**
   * Tone alignment
   */
  toneMatch: boolean;

  /**
   * Complexity alignment
   */
  complexityMatch: boolean;

  /**
   * Misalignments detected
   */
  misalignments: string[];

  /**
   * Suggestions for better alignment
   */
  suggestions: string[];
}

/**
 * Platform compliance result
 */
export interface PlatformCompliance {
  /**
   * Is compliant with platform rules
   */
  isCompliant: boolean;

  /**
   * Violated rules
   */
  violations: string[];

  /**
   * Character count status
   */
  characterCount?: {
    current: number;
    limit: number;
    remaining: number;
  };

  /**
   * Format compliance
   */
  formatCompliance: boolean;
}

/**
 * Cultural sensitivity result
 */
export interface CulturalSensitivityResult {
  /**
   * Sensitivity score (0-100)
   */
  score: number;

  /**
   * Cultural issues detected
   */
  issues: CulturalIssue[];

  /**
   * Positive cultural elements
   */
  positives: string[];

  /**
   * Regional appropriateness
   */
  regionalAppropriateness: Map<string, boolean>;
}

/**
 * Regulatory compliance result
 */
export interface RegulatoryComplianceResult {
  /**
   * Is compliant with regulations
   */
  isCompliant: boolean;

  /**
   * Applicable regulations
   */
  regulations: string[];

  /**
   * Compliance status by regulation
   */
  complianceByRegulation: Map<string, ComplianceStatus>;

  /**
   * Required disclosures missing
   */
  missingDisclosures: string[];

  /**
   * Prohibited content found
   */
  prohibitedContent: string[];
}

/**
 * Context requirements
 */
export interface ContextRequirements {
  /**
   * Required elements
   */
  required: RequiredElement[];

  /**
   * Prohibited elements
   */
  prohibited: ProhibitedElement[];

  /**
   * Recommended elements
   */
  recommended: string[];

  /**
   * Constraints
   */
  constraints: ContextConstraint[];
}

/**
 * Content improvement suggestion
 */
export interface ContentImprovement {
  /**
   * Type of improvement
   */
  type: ImprovementType;

  /**
   * Original text
   */
  original: string;

  /**
   * Suggested text
   */
  suggested: string;

  /**
   * Reason for improvement
   */
  reason: string;

  /**
   * Expected impact
   */
  impact: string;

  /**
   * Confidence in suggestion
   */
  confidence: number;
}

/**
 * Supporting type definitions
 */
export interface TextPosition {
  start: number;
  end: number;
}

export interface PlatformRule {
  id: string;
  description: string;
  type: 'required' | 'prohibited' | 'recommended';
}

export interface HashtagRules {
  minCount?: number;
  maxCount?: number;
  required?: string[];
  prohibited?: string[];
}

export interface CulturalIssue {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  affectedRegions: string[];
}

export interface RequiredElement {
  element: string;
  reason: string;
}

export interface ProhibitedElement {
  element: string;
  reason: string;
}

export interface ContextConstraint {
  type: string;
  value: string | number | boolean | string[] | Record<string, unknown>;
  description: string;
}

export interface ComplianceStatus {
  compliant: boolean;
  issues?: string[];
}

export interface BrandVoiceProfile {
  tone: string[];
  personality: string[];
  vocabulary: 'simple' | 'moderate' | 'sophisticated';
  formality: 'casual' | 'conversational' | 'professional' | 'formal';
}

export interface CulturalContext {
  regions: string[];
  sensitivities: string[];
  preferences: string[];
  taboos: string[];
}

export interface RegulatoryContext {
  jurisdictions: string[];
  industries: string[];
  requirements: string[];
}

export interface AccessibilityNeeds {
  visualImpairment?: boolean;
  hearingImpairment?: boolean;
  cognitiveNeeds?: boolean;
  motorImpairment?: boolean;
}

export enum AudienceType {
  GENERAL_PUBLIC = 'general_public',
  PROFESSIONALS = 'professionals',
  STUDENTS = 'students',
  SENIORS = 'seniors',
  CHILDREN = 'children',
  EXPERTS = 'experts',
  CUSTOMERS = 'customers',
  EMPLOYEES = 'employees',
  INVESTORS = 'investors',
  MEDIA = 'media',
}

export enum EducationLevel {
  ELEMENTARY = 'elementary',
  HIGH_SCHOOL = 'high_school',
  UNDERGRADUATE = 'undergraduate',
  GRADUATE = 'graduate',
  PROFESSIONAL = 'professional',
}

export interface ProfessionalBackground {
  industry: string;
  role?: string;
  experience?: 'entry' | 'mid' | 'senior' | 'executive';
}

export enum TechnicalProficiency {
  NOVICE = 'novice',
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export enum ViolationType {
  INAPPROPRIATE_TONE = 'inappropriate_tone',
  WRONG_AUDIENCE_LEVEL = 'wrong_audience_level',
  PLATFORM_VIOLATION = 'platform_violation',
  REGULATORY_VIOLATION = 'regulatory_violation',
  CULTURAL_INSENSITIVE = 'cultural_insensitive',
  BRAND_INCONSISTENT = 'brand_inconsistent',
  ACCESSIBILITY_ISSUE = 'accessibility_issue',
  TEMPORAL_INAPPROPRIATE = 'temporal_inappropriate',
}

export enum ImprovementType {
  TONE_ADJUSTMENT = 'tone_adjustment',
  SIMPLIFICATION = 'simplification',
  CLARIFICATION = 'clarification',
  ENHANCEMENT = 'enhancement',
  COMPLIANCE_FIX = 'compliance_fix',
  CULTURAL_ADAPTATION = 'cultural_adaptation',
  ACCESSIBILITY_IMPROVEMENT = 'accessibility_improvement',
}

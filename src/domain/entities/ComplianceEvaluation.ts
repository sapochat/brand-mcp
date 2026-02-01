import { Content } from './Content.js';
import { Brand } from './Brand.js';

/**
 * Domain entity representing the result of a brand compliance evaluation
 */
export class ComplianceEvaluation {
  constructor(
    public readonly content: Content,
    public readonly brand: Brand,
    public readonly complianceScore: number,
    public readonly issues: readonly ComplianceIssue[],
    public readonly summary: string,
    public readonly context?: string,
    public readonly timestamp: Date = new Date()
  ) {
    if (complianceScore < 0 || complianceScore > 100) {
      throw new Error('Compliance score must be between 0 and 100');
    }
  }

  /**
   * Check if content is compliant (typically score >= 80)
   */
  get isCompliant(): boolean {
    return this.complianceScore >= 80;
  }

  /**
   * Get issues by severity level
   */
  getIssuesBySeverity(severity: IssueSeverity): readonly ComplianceIssue[] {
    return this.issues.filter((issue) => issue.severity === severity);
  }

  /**
   * Get issues by type
   */
  getIssuesByType(type: IssueType): readonly ComplianceIssue[] {
    return this.issues.filter((issue) => issue.type === type);
  }

  /**
   * Check if there are any high severity issues
   */
  get hasHighSeverityIssues(): boolean {
    return this.issues.some((issue) => issue.severity === IssueSeverity.HIGH);
  }
}

/**
 * Represents a specific compliance issue found in content
 */
export class ComplianceIssue {
  constructor(
    public readonly type: IssueType,
    public readonly severity: IssueSeverity,
    public readonly description: string,
    public readonly suggestion: string,
    public readonly context?: string
  ) {}
}

/**
 * Types of compliance issues
 */
export enum IssueType {
  TONE = 'tone',
  VOICE = 'voice',
  TERMINOLOGY = 'terminology',
  VISUAL = 'visual',
}

/**
 * Severity levels for compliance issues
 */
export enum IssueSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

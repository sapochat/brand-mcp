/**
 * Domain entity representing content to be evaluated
 */
export class Content {
  constructor(
    public readonly text: string,
    public readonly context?: string,
    public readonly metadata?: ContentMetadata
  ) {
    if (!text || text.trim().length === 0) {
      throw new Error('Content text cannot be empty');
    }
  }

  /**
   * Get content length in characters
   */
  get length(): number {
    return this.text.length;
  }

  /**
   * Check if content is considered long form (>500 characters)
   */
  get isLongForm(): boolean {
    return this.text.length > 500;
  }

  /**
   * Get content as normalized text (trimmed, single spaces)
   */
  get normalizedText(): string {
    return this.text.trim().replace(/\s+/g, ' ');
  }
}

/**
 * Metadata that can be attached to content
 */
export interface ContentMetadata {
  readonly source?: string;
  readonly contentType?: string;
  readonly language?: string;
  readonly createdAt?: Date;
  readonly tags?: readonly string[];
}

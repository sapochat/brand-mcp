/**
 * Sample sentiment analysis enricher plugin
 */
export default class SentimentEnricherPlugin {
  constructor() {
    this.id = 'sentiment-enricher';
    this.name = 'Sentiment Analysis Enricher';
    this.version = '1.0.0';
    this.description = 'Enriches content with sentiment analysis metadata';
    this.priority = 100; // Higher priority runs first

    // Simple sentiment keywords (for demo)
    this.positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'happy'];
    this.negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'angry', 'sad'];
    this.neutralWords = ['okay', 'fine', 'average', 'normal', 'regular'];
  }

  isCompatible(systemVersion) {
    return systemVersion.startsWith('1.');
  }

  async enrich(content, metadata) {
    const contentLower = content.toLowerCase();
    
    // Count sentiment indicators
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    this.positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = contentLower.match(regex);
      if (matches) positiveCount += matches.length;
    });

    this.negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = contentLower.match(regex);
      if (matches) negativeCount += matches.length;
    });

    this.neutralWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = contentLower.match(regex);
      if (matches) neutralCount += matches.length;
    });

    // Calculate sentiment score
    const totalWords = positiveCount + negativeCount + neutralCount;
    let sentiment = 'neutral';
    let sentimentScore = 0;

    if (totalWords > 0) {
      sentimentScore = ((positiveCount - negativeCount) / totalWords) * 100;
      
      if (sentimentScore > 30) {
        sentiment = 'positive';
      } else if (sentimentScore < -30) {
        sentiment = 'negative';
      } else {
        sentiment = 'neutral';
      }
    }

    // Detect tone
    const tones = [];
    if (content.includes('!')) tones.push('emphatic');
    if (content.includes('?')) tones.push('questioning');
    if (content.length > 500) tones.push('detailed');
    if (content.length < 50) tones.push('brief');
    if (/\b(please|thank you|sorry)\b/i.test(content)) tones.push('polite');

    // Return enriched content with metadata
    return {
      original: content,
      enriched: content, // Could modify content here if needed
      metadata: {
        sentiment: {
          overall: sentiment,
          score: sentimentScore.toFixed(2),
          positiveIndicators: positiveCount,
          negativeIndicators: negativeCount,
          neutralIndicators: neutralCount
        },
        tone: tones,
        wordCount: content.split(/\s+/).length,
        characterCount: content.length,
        enrichedAt: new Date().toISOString(),
        enrichedBy: this.id
      }
    };
  }
}
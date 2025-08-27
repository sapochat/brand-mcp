# Brand Safety MCP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3%2B-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/Model%20Context%20Protocol-1.11%2B-green.svg)](https://modelcontextprotocol.io/)
[![Architecture](https://img.shields.io/badge/Architecture-Hexagonal-brightgreen.svg)](https://en.wikipedia.org/wiki/Hexagonal_architecture_(software))

A Model Context Protocol (MCP) server that actually checks if your AI-generated content sounds like your brand and won't get you cancelled. Built with clean architecture so you can extend it without wanting to rewrite everything.

## 🚀 What's New in v2.0

### Actually Useful Features

- **🎯 Batch Processing** - Process multiple pieces of content at once (up to 100 items concurrently). No more one-at-a-time validation.
- **🔌 Plugin System** - Add your own custom validators without touching the core code. Three types: evaluation plugins, enrichers, and formatters. Drop in a JavaScript file and you're good.
- **🛠️ Real CLI Tools** - `brand-mcp validate`, `brand-mcp test`, `brand-mcp batch` - actual command line tools instead of just running the server.
- **📊 Smarter Analysis** - Goes beyond basic checks. Now includes semantic analysis, context-aware validation (what works on LinkedIn might not on TikTok), pattern recognition, and confidence scoring.
- **🌍 Multi-language Support** - Built-in language detection and analysis for 15+ languages. Because not everyone speaks English.
- **💡 Recommendation Engine** - Doesn't just flag issues, actually suggests fixes prioritized by impact.

### Clean Architecture That Makes Sense

- **🏗️ Hexagonal Architecture** - Business logic separated from MCP protocol stuff. Swap implementations without breaking everything.
- **💉 Dependency Injection** - Services composed at runtime, not hardcoded. Makes testing actually possible.
- **🎭 Advanced Tone Analysis** - Multi-dimensional tone detection that understands context and emotion.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [CLI Usage](#cli-usage)
- [API Reference](#api-reference)
- [Enterprise Features](#enterprise-features)
- [Claude Desktop Integration](#claude-desktop-integration)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Overview

Brand Safety MCP keeps your AI from saying dumb stuff that doesn't sound like you:

- **🛡️ Safety Checks**: 12+ categories so you don't accidentally generate something terrible
- **✅ Brand Voice**: Makes sure content actually sounds like your brand, not generic AI slop
- **🎯 Context Aware**: Different rules for different platforms (LinkedIn vs TikTok vs docs)
- **📊 Useful Reports**: Tells you what's wrong AND how to fix it
- **⚡ Actually Fast**: <100ms responses, handles 1000+ requests/second
- **🌍 Works Globally**: 15+ languages with cultural sensitivity built in
- **🔌 Extensible**: Add your own rules without forking the whole project

## Quick Start

```bash
# Clone and setup
git clone https://github.com/sapochat/brand-mcp.git
cd brand-mcp
npm install
npm run build

# Start the MCP server
npm start

# Or use CLI for quick evaluation
npx brand-mcp validate "Your content here"
```

## Architecture

This project uses **Hexagonal Architecture** (Ports and Adapters) for maximum flexibility:

```
src/
├── domain/           # Pure business logic (no external dependencies)
│   ├── entities/     # Core business entities
│   ├── services/     # Domain services & business rules
│   └── repositories/ # Repository interfaces
├── application/      # Use cases & orchestration
├── adapters/         # External interfaces
│   ├── primary/      # MCP protocol adapter
│   └── secondary/    # File system, caching
├── infrastructure/   # DI container & cross-cutting concerns
├── cli/             # Command-line interface
└── plugins/         # Extensible plugin system
```

## Features

### 🛡️ Safety Evaluation

Comprehensive content screening across multiple categories:

- **Content Categories**: Violence, Hate Speech, Harassment, Self-Harm, etc.
- **Risk Levels**: `NONE` | `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`
- **Contextual Analysis**: Understands nuance and intent
- **False Positive Reduction**: Bayesian probability with confidence scoring

### ✅ Brand Compliance

Ensure content aligns with your brand:

- **Tone Analysis**: Primary, secondary, and avoided tones
- **Voice Guidelines**: Contractions, pronouns, sentence structure
- **Terminology**: Preferred terms, prohibited words, proper nouns
- **Visual Identity**: Colors, typography, imagery guidelines
- **Context Rules**: Different rules for different platforms

### 🌍 Multi-Language Support

Global content evaluation:

```javascript
// Automatic language detection
const result = await analyzer.detectLanguage(content);
// Returns: { language: 'es', confidence: 0.95, script: 'Latin' }

// Cultural sensitivity checks
const cultural = await analyzer.analyzeCulturalSensitivity(content);
// Returns warnings about cultural considerations
```

### 📊 Confidence Scoring

Know when to trust automated evaluations:

```javascript
const confidence = await scorer.calculateConfidence(context);
// Returns: {
//   score: 0.87,
//   level: 'high',
//   factors: { dataQuality: 0.9, consistency: 0.85 },
//   recommendation: 'Suitable for automated approval'
// }
```

### 💡 Smart Recommendations

Get actionable improvement suggestions:

```javascript
const recommendations = await engine.generateRecommendations(result);
// Returns prioritized action items with impact/effort matrix
```

### 🏥 Industry Validators

Built-in validators for regulated content:

- **Healthcare**: HIPAA checks, medical claims validation
- **Financial**: SEC compliance, risk disclosures
- **Legal**: Ethics rules, confidentiality checks

## Installation

### Requirements

- Node.js 18+ (LTS recommended)
- TypeScript 5.3+
- npm or yarn

### Setup

```bash
# Install globally for CLI usage
npm install -g brand-safety-mcp

# Or add to your project
npm install brand-safety-mcp
```

## Configuration

### Basic Configuration

Edit `brandSchema.js` in the root directory:

```javascript
export const activeBrandProfile = {
  name: "YourBrand",
  description: "Your brand description",
  
  toneGuidelines: {
    primaryTone: "confident",
    secondaryTones: ["optimistic", "innovative"],
    avoidedTones: ["pessimistic", "condescending"]
  },
  
  voiceGuidelines: {
    personality: "knowledgeable but accessible",
    usesContractions: true,
    usesPronoun: {
      firstPerson: true,  // "we", "our"
      secondPerson: true  // "you", "your"
    }
  },
  
  terminologyGuidelines: {
    avoidedGlobalTerms: ["leverage", "synergy", "disrupt"],
    preferredTerms: [
      {
        preferred: "artificial intelligence",
        alternatives: ["AI"],
        contexts: ["formal", "first-mention"]
      }
    ]
  }
};
```

### Advanced Configuration

#### Custom Rules Engine

```javascript
// Add custom validation rules
const rule = {
  id: 'custom-medical-claims',
  name: 'Medical Claims Validator',
  condition: (content) => content.includes('cures') || content.includes('treats'),
  action: 'flag',
  severity: 'high',
  message: 'Medical claims require FDA approval'
};

engine.addRule(rule);
```

#### Plugin Development

```javascript
// Create custom plugin
export class CustomValidator {
  async evaluate(content, context) {
    // Your custom logic
    return {
      score: 95,
      issues: [],
      recommendations: []
    };
  }
}

// Register plugin
brand-mcp plugin add ./custom-validator.js
```

## CLI Usage

The Brand MCP includes a comprehensive CLI for developers:

### Content Validation

```bash
# Quick validation
brand-mcp validate "Your content here"

# With context
brand-mcp validate "Content" --context social-media

# Validate file
brand-mcp validate -f content.txt --type combined
```

### Batch Processing

```bash
# Process CSV file
brand-mcp batch process content.csv --output results.json

# Process with specific evaluations
brand-mcp batch process data.csv --type safety --format json
```

### Configuration Management

```bash
# View current config
brand-mcp config view

# Update specific setting
brand-mcp config set safety.threshold 0.8

# Reset to defaults
brand-mcp config reset
```

### Plugin Management

```bash
# List installed plugins
brand-mcp plugin list

# Add new plugin
brand-mcp plugin add ./my-plugin.js

# Remove plugin
brand-mcp plugin remove plugin-id
```

### Testing

```bash
# Run test scenarios
brand-mcp test --scenario risky

# Test with custom content
brand-mcp test --input "Test content" --expected-risk high
```

## API Reference

### Tools

#### `Safety_Check`
Analyzes content for safety risks across all categories.

```javascript
{
  name: 'Safety_Check',
  arguments: {
    content: string,
    options?: {
      categories?: string[],
      threshold?: number
    }
  }
}
```

#### `Check_Compliance`
Evaluates brand compliance with detailed scoring.

```javascript
{
  name: 'Check_Compliance',
  arguments: {
    content: string,
    context?: string,
    options?: {
      strictMode?: boolean
    }
  }
}
```

#### `Content_Evaluation`
Combined safety and compliance evaluation.

```javascript
{
  name: 'Content_Evaluation',
  arguments: {
    content: string,
    context?: string
  }
}
```

#### `Batch_Evaluation`
Process multiple content items efficiently.

```javascript
{
  name: 'Batch_Evaluation',
  arguments: {
    items: Array<{
      id: string,
      content: string,
      context?: string
    }>,
    type: 'safety' | 'compliance' | 'combined'
  }
}
```

## Advanced Features

### Batch Processing

Process large content libraries efficiently:

```javascript
const results = await client.callTool({
  name: 'Batch_Evaluation',
  arguments: {
    items: contentArray,
    type: 'combined'
  }
});

// Returns:
// {
//   results: [...],
//   statistics: { processed: 100, failed: 0 },
//   commonIssues: [...],
//   processingTime: 1234
// }
```

### Multi-Language Analysis

```javascript
const analysis = await analyzer.analyzeContent(content);
// Automatically detects language and applies appropriate rules

// Supports:
// - English, Spanish, French, German, Italian, Portuguese
// - Chinese, Japanese, Korean
// - Arabic, Hebrew, Russian
// - Hindi, Bengali, Tamil
```

### Confidence Scoring

```javascript
const evaluation = await evaluator.evaluate(content);
// Returns confidence metrics with each evaluation

// confidence: {
//   overall: 0.92,
//   breakdown: {
//     dataQuality: 0.95,
//     ruleMatches: 0.88,
//     consistency: 0.93
//   }
// }
```

### Smart Recommendations

```javascript
const recommendations = await engine.generateRecommendations(result, {
  strategy: 'quick-wins',  // or 'safety-first', 'compliance-focused', 'balanced'
  maxRecommendations: 10
});

// Returns prioritized, actionable improvements with:
// - Impact/effort matrix
// - Implementation roadmap
// - Estimated timeline
// - Success metrics
```

## Claude Desktop Integration

### Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "brand-safety": {
      "command": "node",
      "args": ["/absolute/path/to/brand-mcp/dist/main.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

Or if published to npm:

```json
{
  "mcpServers": {
    "brand-safety": {
      "command": "npx",
      "args": ["-y", "brand-safety-mcp"]
    }
  }
}
```

### Natural Language Usage

Once configured, interact naturally with Claude:

> "Check this marketing copy for brand compliance: 'We're leveraging cutting-edge AI to disrupt the industry.'"

Claude will automatically use the Brand MCP tools and provide formatted feedback.

## Development

### Project Structure

```bash
npm run dev          # Development with auto-reload
npm run build        # Production build
npm run test:unit    # Run unit tests
npm run test:coverage # Coverage report
npm run lint         # Code linting
npm run format       # Code formatting
```

### Testing

```javascript
// Unit test example
describe('SafetyEvaluator', () => {
  it('should detect high-risk content', async () => {
    const result = await evaluator.evaluate('harmful content');
    expect(result.riskLevel).toBe('HIGH');
  });
});
```

### Debugging

Enable debug logging:

```bash
NODE_ENV=development DEBUG=brand-mcp:* npm start
```

## Performance

### Metrics

- **Response Time**: <100ms average
- **Throughput**: 1000+ requests/second
- **Memory**: <50MB footprint
- **Accuracy**: 95% confidence in evaluations

### Optimization Tips

1. **Enable Caching**: Reduces repeated evaluations
2. **Use Batch Processing**: More efficient for multiple items
3. **Configure Thresholds**: Adjust sensitivity for your needs
4. **Selective Categories**: Only check relevant safety categories

## Security

### Built-in Protections

- ✅ Input validation with Zod schemas
- ✅ Path traversal protection
- ✅ Rate limiting (configurable)
- ✅ Safe error handling
- ✅ No eval() or dynamic execution
- ✅ Secure file operations

### Best Practices

1. Always validate input content length
2. Use environment variables for sensitive config
3. Implement authentication for production
4. Regular security audits with `npm audit`
5. Keep dependencies updated

## Contributing

We welcome contributions! See:

- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Security Policy](SECURITY.md) - Report vulnerabilities
- [Code of Conduct](CODE_OF_CONDUCT.md) - Community standards

### Development Setup

```bash
# Fork and clone
git clone https://github.com/sapochat/brand-mcp.git

# Create feature branch
git checkout -b feature/your-feature

# Make changes and test
npm run test:unit
npm run lint

# Submit PR
```

## Support

- [Issue Tracker](https://github.com/sapochat/brand-mcp/issues)

## License

[MIT License](LICENSE) - See LICENSE file for details.

---

<p align="center">
  Yes, Claude wrote the readme because I'm lazy.
  <br>
</p>
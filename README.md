# Brand Safety MCP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3%2B-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/Model%20Context%20Protocol-1.11%2B-green.svg)](https://modelcontextprotocol.io/)

A production-ready Model Context Protocol (MCP) server that provides comprehensive brand safety evaluation and compliance checking for AI-generated content. This enterprise-grade solution ensures content not only avoids harmful categories but also maintains strict adherence to your organization's brand voice, tone, terminology, and contextual guidelines.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Running and Testing](#running-and-testing)
  - [Starting the MCP Server](#starting-the-mcp-server)
  - [Testing with Built-in Clients](#testing-with-built-in-clients)
  - [Integrating with Client Applications](#integrating-with-client-applications)
  - [Using with Claude](#using-with-claude)
- [Customizing for Your Brand](#customizing-for-your-brand)
- [Moving from Demo to Production](#moving-from-demo-to-production)
- [Brand Safety Features](#brand-safety-features)
- [Brand Compliance Features](#brand-compliance-features)
- [Context-Aware Evaluation](#context-aware-evaluation)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

## Overview

Brand Safety MCP acts as an intelligent gatekeeper for AI-generated content across your organization. Built with enterprise security and performance in mind, it provides:

- **🛡️ Advanced Safety Evaluation**: Comprehensive content screening across 12+ safety categories with configurable risk tolerances
- **✅ Brand Compliance Checking**: Real-time verification against your organization's specific brand guidelines
- **🎯 Context-Aware Analysis**: Intelligent rule application based on content type and usage context
- **📊 Detailed Compliance Reporting**: Actionable insights with severity levels, suggestions, and compliance scores
- **🔒 Enterprise Security**: Built-in security features including input validation, rate limiting, and path traversal protection
- **⚡ Performance Optimized**: Caching system, efficient algorithms, and scalable architecture

## Installation

```bash
# Clone the repository
git clone https://github.com/sapochat/brand-mcp.git
cd brand-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Running and Testing

### Starting the MCP Server

To start the Brand MCP server:

```bash
npm start
```

The server uses stdio as the transport mechanism, making it compatible with various MCP clients including Claude Desktop App, Cursor, and other tools that support MCP.

### Testing with Built-in Clients

The package includes comprehensive testing utilities and demo clients:

#### Quick Verification

```bash
npm run test        # Basic functionality test
npm run test:unit   # Run unit test suite
npm run test:coverage # Generate coverage report
```

#### Interactive Demo

```bash
npm run demo        # Brand compliance demonstration
npm run sdk-demo    # Full SDK integration example
```

These demos showcase real-world usage patterns with your configured brand guidelines.

### Production Integration

For production deployments, integrate Brand Safety MCP into your applications:

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Initialize the client
const transport = new StdioClientTransport({
  command: 'node',
  args: ['path/to/dist/index.js'] 
});

const client = new Client({
  name: 'your-client-name',
  version: '1.0.0'
});

// Connect to the server
await client.connect(transport);

// Evaluate content for brand safety
const safetyResult = await client.callTool({
  name: 'analyzeSafety',
  arguments: {
    content: "Your content to evaluate"
  }
});

// Check brand compliance
const complianceResult = await client.callTool({
  name: 'checkBrandCompliance',
  arguments: {
    content: "Your content to check",
    context: "social-media" // Optional context
  }
});
```

### Using with Claude

You can use the Brand MCP with Claude in a natural conversational way without requiring JSON formatting. Here's how to set it up and use it in a chat environment:

#### Setup for Claude Desktop App

1. Start your Brand MCP server using `npm start` in a terminal window
2. Open the Claude Desktop App 
3. Configure Claude to use your running MCP server (via Settings > Model Context Protocols)

#### Claude Desktop Configuration

For a more seamless experience, you can configure Claude Desktop to automatically start the Brand MCP server when the app launches:

1. Open the Claude menu on your computer and select "Settings..."
2. Click on "Developer" in the left-hand bar, then click "Edit Config"
3. This will open your configuration file (`claude_desktop_config.json`)
4. Update the file to include the Brand MCP server:

##### Option 1: Direct Path Configuration
```json
{
  "mcpServers": {
    "brandSafety": {
      "command": "node",
      "args": ["path/to/your/brand-mcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

Replace `"path/to/your/brand-mcp/dist/index.js"` with the absolute path to the compiled index.js file in your brand-mcp project.

For example:
- macOS: `"/Users/username/Documents/brand-mcp/dist/index.js"`
- Windows: `"C:\\Users\\username\\Documents\\brand-mcp\\dist\\index.js"`

##### Option 2: Using NPX (If Published to NPM)
If you've published your Brand MCP to NPM, you can use npx for a more streamlined installation - you can rename your server by replacing "Brand Check" in the below:

```json
{
  "mcpServers": {
    "Brand Check": {
      "command": "npx",
      "args": [
        "-y",
        "brand-safety-mcp"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

5. Save the file and restart Claude Desktop

When Claude Desktop starts, you should see a hammer icon in the input box, indicating that tools are available. Clicking this icon should show tools including "analyzeSafety" and "checkBrandCompliance".

If you don't see the tools, check the logs:
- macOS: `~/Library/Logs/Claude/mcp*.log`
- Windows: `%APPDATA%\Claude\logs\mcp*.log`

##### Troubleshooting Claude Desktop Integration

If the server isn't showing up in Claude Desktop:
1. Make sure you've built the project with `npm run build` before configuring Claude
2. Check that the path in your configuration points to the correct location
3. Try running the server manually to see if there are any errors
4. Check Claude's logs for detailed error information

#### Natural Language Usage

Interact with Brand Safety MCP using conversational prompts:

**Example Request:**
> "Please review this marketing email for brand compliance:
> 
> 'We're excited to announce our AI product that leverages cutting-edge technology to disrupt the market.'
> 
> Check for tone and terminology issues."

**Example Response:**
> **Compliance Score:** 65/100 ⚠️
> 
> **Issues Identified:**
> - 🚫 Prohibited terms: "leverage" (2x), "disrupt" 
> - 📝 Tone: Overuse of business clichés
> 
> **Suggested Revision:**
> "We're excited to announce our AI product that uses innovative technology to transform the market."

#### Implementation in Conversation Flow

For a seamless conversation experience, you can instruct Claude to:

1. Accept content for review in natural language
2. Apply the appropriate brand guidelines based on context
3. Provide analysis and suggestions in a clear, conversational format
4. Offer revised versions that better align with brand guidelines

This approach makes the Brand MCP accessible to non-technical users who interact with Claude through the desktop app or other chat interfaces.

## Customizing for Your Brand

To customize the MCP for your specific brand, you need to modify the `activeBrandProfile` object within the `brandSchema.js` file located in the root directory. The `brandSchema` object (also in `brandSchema.js`) serves as a template and documentation for the structure of `activeBrandProfile`.

The `activeBrandProfile` object includes comprehensive dimensions for brand guidelines:

### Brand Identity
```javascript
// Example of fields within the activeBrandProfile object in brandSchema.js:
name: "YourBrandName",
description: "Your brand description",
```

### Tone Guidelines
```javascript
toneGuidelines: {
  primaryTone: "confident", // Main tone of your brand communications
  secondaryTones: ["optimistic", "innovative", "approachable"], // Supporting tones
  avoidedTones: ["pessimistic", "overly technical", "condescending"], // Tones to avoid
  tonalShift: {
    // How tone changes across different contexts
    "social-media": "more casual and conversational",
    "documentation": "more detailed and instructive",
    "marketing": "more aspirational and inspiring"
  },
  examples: {
    // Example content demonstrating appropriate tone for different contexts
    "social": "Example of social media post tone",
    "documentation": "Example of documentation tone",
    "marketing": "Example of marketing content tone"
  }
},
```

### Voice Guidelines
```javascript
voiceGuidelines: {
  personality: "knowledgeable but accessible; a helpful expert", // Brand personality
  sentence: {
    length: "varied, but generally concise", // Preferred sentence length
    structure: "clear and direct, with simple language" // Preferred structure
  },
  usesContractions: true, // Whether to use contractions (e.g., "we're" vs "we are")
  usesPronoun: {
    firstPerson: true, // Use "we", "our", etc.
    secondPerson: true // Use "you", "your", etc.
  },
  examples: {
    // Examples demonstrating the brand voice
    "typical": "We've designed this feature with your workflow in mind."
  }
},
```

### Visual Identity
```javascript
visualIdentity: {
  colors: {
    primary: ["#0063B2", "#9CC3D5"], // Primary brand colors (hex codes)
    secondary: ["#F9A826", "#D8E9A8"], // Secondary brand colors
    forbidden: ["#FF0000", "#FF00FF"] // Colors that should never be used
  },
  typography: {
    headingFont: "Montserrat, sans-serif", // Font family for headings
    bodyFont: "Open Sans, sans-serif", // Font family for body text
    fontSizes: {
      // Recommended font sizes
      heading: {
        h1: "2.5rem",
        h2: "2rem",
        h3: "1.75rem"
      },
      body: "1rem"
    }
  },
  imagery: {
    style: "clean, bright photos with people using technology", // Image style
    subjects: ["diverse people", "sustainable technology"], // Recommended subjects
    avoidedSubjects: ["outdated technology", "generic stock imagery"] // Subjects to avoid
  },
  layout: {
    preferences: "clean and spacious with clear hierarchy", // Layout preferences
    gridSystem: "12-column responsive grid with ample whitespace" // Grid system details
  }
},
```

### Context-Specific Visual Rules
```javascript
contextualVisualRules: [
  {
    contexts: ["social-media", "blog-informal"], // Contexts where rules apply
    applyRules: {
      imagery: { 
        style: "more vibrant and engaging, potentially using illustrations",
        notes: "Prioritize engagement over strict adherence to primary style"
      },
      typography: { 
        notes: "Can use slightly larger, bolder fonts for emphasis"
      }
    }
  },
  {
    contexts: ["print", "formal-report"],
    applyRules: {
      colors: { 
        notes: "Ensure primary colors are dominant. Use secondary sparingly."
      },
      typography: { 
        headingFont: "Montserrat, sans-serif",
        bodyFont: "Open Sans, sans-serif",
        notes: "Strict adherence to standard font sizes required."
      },
      layout: { 
        preferences: "clean, structured layout with consistent margins",
        notes: "Whitespace is critical for formal print documents."
      }
    }
  }
],
```

### Terminology Guidelines
```javascript
terminologyGuidelines: {
  avoidedGlobalTerms: ["synergy", "leverage", "disruptive"], // Terms to always avoid
  properNouns: {
    productNames: "Always capitalized, no spaces (e.g., ProductName)",
    companyName: "YourCompany (with exact capitalization)"
  },
  terms: [
    {
      preferred: "purchase", // The preferred term to use
      alternatives: ["buy", "acquire"], // Alternative terms to avoid
      contexts: ["ecommerce", "sales"], // Contexts where this rule applies
      notes: "Use 'purchase' in customer-facing transaction contexts."
    },
    {
      preferred: "artificial intelligence",
      alternatives: ["AI"],
      contexts: ["formal", "documentation", "first-mention"],
      notes: "Spell out on first use or in formal documents."
    },
    {
      term: "bleeding edge", // Term to avoid in specific contexts
      avoidInContexts: ["marketing", "formal"],
      notes: "Avoid hype/cliché. Use 'innovative' or 'advanced' instead."
    }
  ]
},
```

### Context-Specific Adjustments
```javascript
contextualAdjustments: [
  {
    contexts: ["social-media", "blog-informal"], // Contexts where adjustments apply
    applyRules: {
      tone: "more casual and conversational", // Override primary tone
      voice: { 
        usesContractions: true, 
        sentenceLength: "shorter"
      }
    }
  },
  {
    contexts: ["technical-documentation", "api-reference"],
    applyRules: {
      tone: "more detailed and instructive",
      voice: { 
        personality: "precise and helpful expert", 
        usesContractions: false, 
        sentenceStructure: "clear and direct" 
      }
    }
  },
  {
    contexts: ["marketing-landingpage", "marketing-email"],
    applyRules: {
      tone: "more aspirational and inspiring"
    }
  }
]
```

After modifying this file with your brand's specific guidelines, rebuild the project with `npm run build`.

## Deployment Guide

### Development to Production

1. **Review Demo Implementation**
   ```bash
   npm run demo  # Explore default configuration
   ```

2. **Customize Brand Guidelines**
   - Edit `activeBrandProfile` in `brandSchema.js`
   - Configure safety tolerances in `src/config/`
   - Add domain-specific exemptions

3. **Build & Validate**
   ```bash
   npm run build
   npm run test:unit
   npm run test:coverage
   ```

4. **Security Audit**
   ```bash
   npm run audit
   npm run lint
   npm run typecheck
   ```

## Features

### Brand Safety Categories

- **Sexual Content**: References to sexual themes or explicit material
- **Violence**: Descriptions of physical harm or violent actions
- **Hate Speech**: Language targeting groups based on protected characteristics
- **Harassment**: Content that bullies, intimidates, or threatens
- **Self-Harm**: References to suicide, self-injury, or harmful behaviors
- **Illegal Activities**: Content about crimes, illegal substances, or prohibited actions
- **Profanity**: Inappropriate language, cursing, or vulgar terms
- **Alcohol/Tobacco**: References to alcohol, tobacco, or related products
- **Political Content**: References to political figures, parties, or controversial topics
- **Religious Content**: References to religious beliefs, practices, or institutions
- **Sentiment Analysis**: Determines the emotional tone of the content (e.g., positive, negative, neutral) using LLM capabilities.
- **Contextual Analysis**: Provides a deeper understanding of content nuances, intent, and potential risks that might be missed by keyword-only checks, using LLM capabilities.

**Risk Levels:** `NONE` | `LOW` | `MEDIUM` | `HIGH` | `VERY_HIGH`

### Brand Compliance Engine

#### Tone Analysis
- **Primary Tone**: Checks if content matches the brand's primary tone
- **Avoided Tones**: Ensures content doesn't use tones that should be avoided
- **Contextual Tone**: Applies different tone expectations based on context
- **Enhanced Detection**: Uses multiple detection methods for more accurate results:
  - Keyword analysis with confidence scoring
  - Phrase pattern detection
  - N-gram analysis
  - Section-based analysis for longer content

### Voice Guidelines
- **Contractions**: Checks whether content uses contractions based on brand preferences
- **Pronouns**: Verifies appropriate use of first-person and second-person pronouns
- **Sentence Structure**: Evaluates sentence length and structure patterns

### Terminology Guidelines
- **Prohibited Terms**: Flags globally avoided terms and phrases
- **Preferred Terms**: Identifies when alternatives are used instead of preferred terminology
- **Proper Nouns**: Verifies correct capitalization and formatting of brand names and products
- **Context-Specific Terms**: Applies different terminology rules based on content context
- **Domain Exemptions**: Automatically exempts certain terms in appropriate contexts

### Advanced Capabilities

### Content Type Detection
The MCP automatically detects the type of content being analyzed and applies appropriate rules:

- **Technical**: Relaxed tone requirements, technical terminology exemptions
- **Marketing**: Appropriate tone for promotional content
- **Legal**: Special handling for legal terminology
- **Educational**: Context-specific rules for educational materials
- **Conversational**: Sentiment-aware analysis

### False Positive Reduction
Multiple mechanisms work together to minimize false positives:

- **Bayesian Probability**: Calculates the likelihood that a detected issue is accurate
- **Context-Aware Analysis**: Adjusts sensitivity based on content context
- **Technical Exemptions**: Automatically exempts technical terms in technical contexts
- **Confidence Scoring**: Only flags issues when confidence exceeds thresholds
- **Feedback Learning**: Improves over time based on false positive reports

### Section-Based Analysis
For longer content, the MCP analyzes sections independently:

- **Paragraph Analysis**: Evaluates each paragraph on its own
- **Section Tracking**: Identifies which section contains issues
- **Priority Filtering**: Focuses on the most important issues
- **Length-Aware Scoring**: Adjusts expectations based on content length

### Sentiment Analysis
Basic sentiment detection provides additional context:

- **Positivity**: Measures positive sentiment
- **Negativity**: Measures negative sentiment
- **Objectivity**: Measures factual/neutral language

### Customization Options
Extensive customization options available:

```javascript
// Add custom technical terms to exempt from checks
brandService.addTechnicalTerms([
  'authentication', 'authorization', 'encryption'
]);

// Add custom technical contexts
brandService.addTechnicalContexts([
  'system-requirements', 'architecture-overview'
]);

// Add domain-specific exemptions
brandService.addDomainExemptions('marketing', [
  'promotional', 'limited-time', 'exclusive-offer'
]);

// Report false positives to improve system
brandService.addFalsePositive(issue, originalContent);
```

## Context-Aware Evaluation

The MCP applies different guidelines based on content context, such as:
- **Social Media**: More casual tone, shorter sentences, contractions allowed
- **Technical Documentation**: More detailed tone, precise language, fewer contractions
- **Marketing**: More aspirational tone with specific approved terminology

When checking content, you can specify a context to apply the appropriate guidelines:

```javascript
// Example of calling the checkBrandCompliance tool
const result = await client.callTool({
  name: 'checkBrandCompliance',
  arguments: {
    content: "We're excited to share our latest breakthrough with you!",
    context: "marketing-landingpage" // Optional context
  }
});

// Result includes:
// - complianceScore: Numeric score from 0-100
// - isCompliant: Boolean (typically true if score ≥ 80)
// - issues: Array of specific compliance issues found
// - summary: Human-readable summary of compliance status
```

## API Reference

### Tools

1. **analyzeSafety**
   - Analyzes text content against brand safety guidelines
   - Parameters:
     - `content`: The content to evaluate for brand safety

2. **checkBrandCompliance**
   - Evaluates content for compliance with brand guidelines
   - Parameters:
     - `content`: The content to check for brand compliance
     - `context`: (Optional) Context for applying specific brand guidelines

3. **updateBrandConfig**
   - Updates brand-specific safety configuration
   - Parameters:
     - `sensitiveKeywords`: Array of brand-specific sensitive keywords
     - `allowedTopics`: Array of topics explicitly allowed for the brand
     - `blockedTopics`: Array of topics explicitly blocked for the brand
     - `riskTolerances`: Object with risk tolerance levels for each category

### Prompts

1. **evaluate-content**
   - Provides a prompt template for brand safety evaluation
   
2. **get-brand-guidelines**
   - Provides a prompt template for brand guidelines

### Resources

1. **brand-safety://guidelines**
   - Comprehensive brand safety guidelines

2. **brand://guidelines**
   - Brand-specific guidelines based on the loaded brand schema

## Sharing Your Brand MCP

Once you've customized your Brand MCP for your organization, you might want to share it with team members or publish it for wider use.

### Publishing to NPM

To make your Brand MCP easily installable in Claude Desktop and other environments:

1. Update your `package.json` with appropriate details:
```json
{
  "name": "@your-org/brand-safety-mcp",
  "version": "1.0.0",
  "description": "Brand safety and compliance MCP for your organization",
  "main": "dist/index.js",
  "bin": "dist/index.js",
  "files": [
    "dist",
    "brandSchema.js"
  ],
  // other properties...
}
```

2. Add a shebang to your entry file (`src/index.ts`):
```typescript
#!/usr/bin/env node
// Rest of your code...
```

3. Build your project:
```bash
npm run build
```

4. Publish to NPM:
```bash
npm publish
```

Now others can use your Brand MCP in Claude Desktop by simply adding this to their `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "brand-safety": {
      "command": "npx",
      "args": [
        "-y",
        "@your-org/brand-safety-mcp"
      ]
    }
  }
}
```

### Sharing Within Your Organization

For internal use cases, you can also:

1. Host the repository on your organization's GitHub or similar platform
2. Document organization-specific brand guidelines and customizations
3. Create a private NPM package if you have an internal registry
4. Provide pre-built versions that colleagues can download and run directly

## Use Cases

- **Content Generation Pipeline**: Automated brand compliance for AI-generated content
- **Marketing Automation**: Ensure all campaigns align with brand voice
- **Documentation Systems**: Maintain consistent technical documentation
- **Customer Communications**: Standardize support responses
- **Social Media Management**: Real-time brand safety checks
- **Legal Compliance**: Ensure content meets regulatory requirements

## Code Examples

```javascript
// Brand safety evaluation
const safetyResult = await client.callTool({
  name: 'analyzeSafety',
  arguments: {
    content: "We've designed this feature with your workflow in mind."
  }
});
// Returns safety evaluation across all categories

// Brand compliance check
const complianceResult = await client.callTool({
  name: 'checkBrandCompliance',
  arguments: {
    content: "We've designed this feature with your workflow in mind.",
    context: "documentation"  
  }
});
// Returns detailed brand compliance analysis
```

## Security & Performance

### Security Features
- ✅ Input validation with Zod schemas
- ✅ Path traversal protection
- ✅ Rate limiting (DoS protection)
- ✅ Safe error handling
- ✅ No eval() or dynamic code execution
- ✅ Secure file operations

### Performance Optimizations
- ⚡ Intelligent caching system
- ⚡ O(n) algorithmic complexity
- ⚡ Lazy loading of resources
- ⚡ Efficient memory management
- ⚡ Batch processing capabilities

## Contributing

We welcome contributions! Please see our:
- [Contributing Guide](CONTRIBUTING.md) - Guidelines for contributing
- [Security Policy](SECURITY.md) - Security vulnerability reporting
- [Code of Conduct](CODE_OF_CONDUCT.md) - Community standards

### Getting Help
- 📖 [Documentation](https://github.com/sapochat/brand-mcp/wiki)
- 🐛 [Issue Tracker](https://github.com/sapochat/brand-mcp/issues)
- 💬 [Discussions](https://github.com/sapochat/brand-mcp/discussions)

## License

[MIT License](LICENSE) - See LICENSE file for details.

---

<p align="center">
  Built with ❤️ for brand consistency in the age of AI
</p>
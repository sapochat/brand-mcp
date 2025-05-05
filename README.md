# Brand Safety MCP

A Model Context Protocol (MCP) server that performs both brand safety evaluation and brand compliance checking for LLM-generated content. This dual-function approach ensures that content not only avoids harmful categories but also aligns with specific brand voice, tone, terminology, and context-specific guidelines.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Usage](#usage)
- [Testing](#testing)
- [Customizing for Your Brand](#customizing-for-your-brand)
- [Brand Safety Features](#brand-safety-features)
- [Brand Compliance Features](#brand-compliance-features)
- [Context-Aware Evaluation](#context-aware-evaluation)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

## Overview

This MCP serves as a barometer for both brand safety and brand compliance when leveraging LLMs to generate content including text, imagery, or other media. It provides:

- **Brand Safety Evaluation**: Check content against safety categories like profanity, violence, etc.
- **Brand Compliance Checking**: Verify alignment with specific brand guidelines
- **Context-Specific Guidelines**: Apply different rules based on content context (social, documentation, marketing)
- **Detailed Feedback**: Get specific issues and recommendations for improvement

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/brand-safety-mcp.git
cd brand-safety-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Starting the MCP Server

```bash
npm start
```

The server uses stdio as the transport mechanism, making it compatible with various MCP clients including Claude Desktop App, Cursor, and other tools that support MCP.

### Integrating with Client Applications

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
  name: 'evaluateContent',
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

## Testing

The package includes several demo clients to test functionality:

### Basic Test

```bash
npm run test
```

This runs a simple test to verify the MCP server is working correctly.

### Demo Client

```bash
npm run demo
```

This demonstrates the brand safety and compliance features with example content.

### SDK Example Client

```bash
npm run sdk-demo
```

This runs a comprehensive example showing how to integrate with the MCP using the SDK, including:
- Brand safety evaluation
- Brand compliance checking
- Context-specific compliance testing

## Customizing for Your Brand

To customize the MCP for your specific brand, you need to modify the `brandSchema.js` file in the root directory:

1. **Edit Brand Information**:
   ```javascript
   name: "YourBrandName",
   description: "Your brand description",
   ```

2. **Define Tone Guidelines**:
   ```javascript
   toneGuidelines: {
     primaryTone: "professional", // or friendly, authoritative, etc.
     secondaryTones: ["helpful", "clear", "concise"],
     avoidedTones: ["sarcastic", "condescending"],
     tonalShift: {
       "social-media": "more casual and conversational",
       "documentation": "more detailed and instructive"
     },
     examples: {
       // Example content for different contexts
     }
   },
   ```

3. **Define Voice Guidelines**:
   ```javascript
   voiceGuidelines: {
     personality: "knowledgeable but approachable",
     sentence: {
       length: "short to medium",
       structure: "simple and direct"
     },
     usesContractions: true, // or false
     usesPronoun: {
       firstPerson: true, // use "we", "our", etc.
       secondPerson: true // use "you", "your", etc.
     }
   },
   ```

4. **Define Terminology Guidelines**:
   ```javascript
   terminologyGuidelines: {
     avoidedGlobalTerms: ["term1", "term2"], // terms to always avoid
     properNouns: {
       companyName: "YourCompany (with exact capitalization)",
       productNames: "Always capitalized (e.g., ProductName)"
     },
     terms: [
       {
         preferred: "preferred term",
         alternatives: ["alternative1", "alternative2"],
         contexts: ["specific-context"] // contexts where this applies
       }
     ]
   },
   ```

5. **Define Context-Specific Adjustments**:
   ```javascript
   contextualAdjustments: [
     {
       contexts: ["social-media", "blog"],
       applyRules: {
         tone: "casual and friendly",
         voice: { 
           usesContractions: true 
         }
       }
     }
   ]
   ```

After modifying this file, rebuild the project with `npm run build`.

## Brand Safety Features

The MCP evaluates content across the following safety categories:

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

Each category is evaluated on a five-level risk scale: NONE, LOW, MEDIUM, HIGH, VERY_HIGH.

## Brand Compliance Features

The MCP checks content for compliance with brand guidelines defined in `brandSchema.js`:

### Tone Guidelines
- **Primary Tone**: Checks if content matches the brand's primary tone
- **Avoided Tones**: Ensures content doesn't use tones that should be avoided
- **Contextual Tone**: Applies different tone expectations based on context

### Voice Guidelines
- **Contractions**: Checks whether content uses contractions based on brand preferences
- **Pronouns**: Verifies appropriate use of first-person and second-person pronouns
- **Sentence Structure**: Evaluates sentence length and structure patterns

### Terminology Guidelines
- **Prohibited Terms**: Flags globally avoided terms and phrases
- **Preferred Terms**: Identifies when alternatives are used instead of preferred terminology
- **Proper Nouns**: Verifies correct capitalization and formatting of brand names and products
- **Context-Specific Terms**: Applies different terminology rules based on content context

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

1. **evaluateContent**
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

## Real-World Usage

Integration with this MCP gives your LLM workflows the following capabilities:

1. **Pre-Check Generated Content**: Verify content meets brand guidelines before publishing
2. **Context-Aware Guidelines**: Apply different rules based on where content will appear
3. **Content Correction**: Identify and fix brand compliance issues
4. **Brand Guidelines Access**: Let LLMs retrieve the latest guidelines on demand
5. **Cross-Team Consistency**: Ensure all teams follow the same brand standards

## Example Tool Usage

```javascript
// Safety evaluation
const safetyResult = await client.callTool({
  name: 'evaluateContent',
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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
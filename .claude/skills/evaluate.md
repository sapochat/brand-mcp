---
name: evaluate
description: Evaluate content for brand safety using the MCP server
---

# Brand Safety Evaluation

Evaluate text content for brand safety concerns.

## Usage

Use this skill when you need to:
- Check if content is safe for brand use
- Identify potential safety risks in text
- Get risk assessments across safety categories

## Safety Categories

The evaluation checks these categories:
- SEXUAL_CONTENT
- VIOLENCE
- HATE_SPEECH
- HARASSMENT
- SELF_HARM
- ILLEGAL_ACTIVITIES
- PROFANITY
- ALCOHOL_TOBACCO
- POLITICAL
- RELIGION
- SENTIMENT_ANALYSIS
- CONTEXTUAL_ANALYSIS

## Example

To evaluate content, use the `safety-check` MCP tool:

```typescript
// Input
{
  content: "Your text content here",
  context: "marketing" // optional context
}

// Output includes:
// - Risk level per category
// - Overall risk assessment
// - Explanations and recommendations
```

## Risk Levels

- **NONE** - No concerns detected
- **LOW** - Minor concerns, likely acceptable
- **MEDIUM** - Review recommended
- **HIGH** - Significant concerns
- **VERY_HIGH** - Content should not be used

## Testing Locally

```bash
# Build the project
npm run build

# Run the MCP server
npm run start

# Or use the CLI
npm run cli -- evaluate "content to check"
```

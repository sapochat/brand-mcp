---
name: compliance
description: Check content compliance with brand guidelines
---

# Brand Compliance Check

Evaluate content against brand guidelines for tone, voice, and terminology.

## Usage

Use this skill when you need to:
- Verify content matches brand voice
- Check terminology usage
- Ensure tone alignment
- Validate against brand rules

## Compliance Dimensions

The check evaluates:

### Tone Analysis
- Formal vs casual
- Friendly vs professional
- Confident vs humble
- Enthusiastic vs neutral

### Voice Consistency
- Brand personality alignment
- Messaging consistency
- Value proposition clarity

### Terminology
- Required terms present
- Prohibited terms avoided
- Industry-specific vocabulary

## Example

Use the `check-compliance` MCP tool:

```typescript
// Input
{
  content: "Your marketing copy here",
  context: "social-media" // optional
}

// Output includes:
// - Compliance score (0-100)
// - Tone analysis results
// - Voice alignment assessment
// - Terminology check results
// - Specific recommendations
```

## Brand Schema

Brand guidelines are defined in `brandSchema.js`:

```javascript
{
  brand: {
    name: "Company Name",
    tone: ["professional", "friendly"],
    voice: {
      personality: ["innovative", "trustworthy"],
      vocabulary: "moderate"
    },
    terminology: {
      required: ["solution", "partnership"],
      prohibited: ["cheap", "basic"]
    }
  }
}
```

## Testing

```bash
npm run cli -- compliance "content to check"
```

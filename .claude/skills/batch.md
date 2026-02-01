---
name: batch
description: Evaluate multiple content items in a single batch operation
---

# Batch Content Evaluation

Process multiple content items efficiently in a single operation.

## Usage

Use this skill when you need to:
- Evaluate multiple pieces of content at once
- Process content lists or feeds
- Bulk check marketing materials
- Audit existing content libraries

## Batch Limits

- Maximum 100 items per batch
- Each item has the same size limits as single evaluation
- Results are returned for all items, including failures

## Example

Use the `batch-evaluation` MCP tool:

```typescript
// Input
{
  items: [
    { id: "post-1", content: "First content piece" },
    { id: "post-2", content: "Second content piece" },
    { id: "post-3", content: "Third content piece", context: "marketing" }
  ],
  evaluationType: "combined", // "safety", "compliance", or "combined"
  includeSafety: true,
  includeBrand: true
}

// Output includes:
// - Individual results for each item
// - Summary statistics
// - Aggregated risk assessment
// - Processing time metrics
```

## Evaluation Types

- **safety** - Only brand safety evaluation
- **compliance** - Only brand compliance check
- **combined** - Both safety and compliance (default)

## Result Structure

```typescript
{
  results: [
    {
      id: "post-1",
      success: true,
      safety: { /* safety evaluation */ },
      compliance: { /* compliance evaluation */ }
    }
  ],
  summary: {
    total: 3,
    successful: 3,
    failed: 0,
    averageRiskLevel: "LOW"
  }
}
```

## Performance Tips

1. Group related content in single batches
2. Use consistent context values within batches
3. Process large datasets in chunks of 100
4. Handle individual failures gracefully

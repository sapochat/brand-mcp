# AGENTS.md

Configuration for AI agents working with the Brand Safety MCP project.

## Project Context

This is an MCP (Model Context Protocol) server implementing brand safety and compliance evaluation using hexagonal architecture.

## Agent Capabilities

### Available Skills

Agents working on this project should use the following skills:

| Skill | When to Use |
|-------|-------------|
| `brand-mcp:evaluate` | Test content against brand safety rules |
| `brand-mcp:compliance` | Check brand compliance for content |
| `brand-mcp:batch` | Evaluate multiple content items at once |

### Domain Knowledge

Agents should understand:

1. **Hexagonal Architecture** - Domain logic is isolated from adapters
2. **MCP Protocol** - Tools, prompts, and resources exposed via SDK
3. **Safety Categories** - 10 categories including hate speech, violence, profanity
4. **Brand Compliance** - Tone, voice, terminology, visual identity rules

## Code Guidelines

### Adding New Safety Categories

1. Add to `BrandSafetyCategory` enum in `src/types/brandSafety.ts`
2. Add default tolerance in `DEFAULT_BRAND_SAFETY_CONFIG`
3. Implement detection in `SafetyEvaluationServiceImpl`
4. Add tests in `src/__tests__/`

### Adding New MCP Tools

1. Define tool in `McpServerAdapter.getAvailableTools()`
2. Add handler method in `McpServerAdapter`
3. Create use case in `src/application/use-cases/`
4. Add validation in `McpRequestValidator`
5. Register in `ContainerBuilder`

### Testing Requirements

- All new features require unit tests
- Coverage thresholds: 80% statements/lines/functions, 70% branches
- Use Jest with ts-jest ESM preset

## File Structure Reference

```
src/
├── domain/              # Pure business logic
│   ├── entities/        # Domain objects
│   ├── services/        # Service interfaces + implementations
│   └── repositories/    # Repository interfaces
├── application/         # Use cases (orchestration)
├── adapters/
│   ├── primary/mcp/     # MCP protocol adapter
│   └── secondary/       # External services (cache, files)
├── infrastructure/di/   # Dependency injection
├── cli/                 # CLI commands
└── plugins/             # Plugin system
```

## Task Coordination

When multiple agents work on this project:

1. **Domain changes** - One agent at a time to avoid conflicts
2. **Test writing** - Can parallelize across different test files
3. **Documentation** - Can parallelize (README, CLAUDE.md, etc.)
4. **Formatters** - Independent, can parallelize

## Verification Commands

```bash
npm run typecheck    # Type safety
npm run lint         # Code style
npm run test         # Unit tests
npm run build        # Full build
```

All commands must pass before committing changes.

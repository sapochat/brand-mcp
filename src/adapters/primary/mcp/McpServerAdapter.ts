import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  Prompt,
  Resource,
} from '@modelcontextprotocol/sdk/types.js';

import { CheckSafetyUseCase } from '../../../application/use-cases/CheckSafetyUseCase.js';
import { CheckComplianceUseCase } from '../../../application/use-cases/CheckComplianceUseCase.js';
import { CombinedEvaluationUseCase } from '../../../application/use-cases/CombinedEvaluationUseCase.js';
import { UpdateConfigUseCase } from '../../../application/use-cases/UpdateConfigUseCase.js';
import { BatchEvaluationUseCase } from '../../../application/use-cases/BatchEvaluationUseCase.js';
import { SafetyResponseFormatter } from './formatters/SafetyResponseFormatter.js';
import { ComplianceResponseFormatter } from './formatters/ComplianceResponseFormatter.js';
import { CombinedResponseFormatter } from './formatters/CombinedResponseFormatter.js';
import { BatchResponseFormatter } from './formatters/BatchResponseFormatter.js';
import { McpRequestValidator } from './validators/McpRequestValidator.js';
import { RateLimiter, wrapError } from '../../../utils/security.js';
import { BrandSchemaRepository } from '../../../domain/repositories/BrandSchemaRepository.js';
import { DEFAULT_BRAND_SAFETY_CONFIG } from '../../../types/brandSafety.js';

/**
 * MCP Request types for tool calls
 */
interface McpToolCallRequest {
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

interface McpPromptRequest {
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

interface McpResourceRequest {
  params: {
    uri: string;
  };
}

/**
 * MCP Response types with index signatures for SDK compatibility
 */
interface McpToolResponse {
  [x: string]: unknown;
  isError?: boolean;
  content: Array<{ type: string; text: string }>;
}

interface McpPromptResponse {
  [x: string]: unknown;
  messages: Array<{
    role: string;
    content: {
      type: string;
      text: string;
    };
  }>;
}

interface McpResourceResponse {
  [x: string]: unknown;
  contents: Array<{
    uri: string;
    mimeType: string;
    text: string;
  }>;
}

/**
 * MCP Server Adapter - handles MCP protocol communication
 */
export class McpServerAdapter {
  private server: Server;
  private rateLimiter: RateLimiter;

  constructor(
    private readonly safetyUseCase: CheckSafetyUseCase,
    private readonly complianceUseCase: CheckComplianceUseCase,
    private readonly combinedUseCase: CombinedEvaluationUseCase,
    private readonly updateConfigUseCase: UpdateConfigUseCase,
    private readonly batchUseCase: BatchEvaluationUseCase | undefined,
    private readonly safetyFormatter: SafetyResponseFormatter,
    private readonly complianceFormatter: ComplianceResponseFormatter,
    private readonly combinedFormatter: CombinedResponseFormatter,
    private readonly batchFormatter: BatchResponseFormatter | undefined,
    private readonly requestValidator: McpRequestValidator,
    private readonly brandSchemaRepository?: BrandSchemaRepository
  ) {
    this.rateLimiter = new RateLimiter();
    this.server = this.createServer();
    this.setupRequestHandlers();
  }

  async start(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
    } catch (error) {
      throw wrapError(error, 'Failed to start MCP server');
    }
  }

  private createServer(): Server {
    return new Server(
      {
        name: 'BrandCheck',
        version: '1.0.1',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
          resources: {},
        },
      }
    );
  }

  private setupRequestHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: this.getAvailableTools() };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return this.handleToolCall(request as McpToolCallRequest);
    });

    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return { prompts: this.getAvailablePrompts() };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      return this.handleGetPrompt(request as McpPromptRequest);
    });

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return { resources: this.getAvailableResources() };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return this.handleReadResource(request as McpResourceRequest);
    });
  }

  private getAvailableTools(): Tool[] {
    return [
      {
        name: 'safety-check',
        description: 'Analyze text content for brand safety concerns',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The content to evaluate for brand safety',
            },
            context: {
              type: 'string',
              description: 'Optional context for the evaluation',
            },
          },
          required: ['content'],
        },
        annotations: {
          title: 'Evaluate Content Safety',
          readOnlyHint: true,
          openWorldHint: false,
        },
      },
      {
        name: 'check-compliance',
        description: 'Evaluate content for compliance with brand guidelines',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The content to check for brand compliance',
            },
            context: {
              type: 'string',
              description: 'Optional context for brand guidelines application',
            },
          },
          required: ['content'],
        },
        annotations: {
          title: 'Check Brand Compliance',
          readOnlyHint: true,
          openWorldHint: false,
        },
      },
      {
        name: 'evaluate-content',
        description: 'Perform a combined evaluation for both brand safety and brand compliance',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The content to evaluate',
            },
            context: {
              type: 'string',
              description: 'Optional context for the evaluation',
            },
            includeSafety: {
              type: 'boolean',
              description: 'Include safety evaluation (default: true)',
            },
            includeBrand: {
              type: 'boolean',
              description: 'Include brand compliance evaluation (default: true)',
            },
            brandWeight: {
              type: 'number',
              description: 'Weight for brand compliance score (1.0-5.0, default: 2.0)',
            },
            safetyWeight: {
              type: 'number',
              description: 'Weight for safety score (1.0-5.0, default: 1.0)',
            },
          },
          required: ['content'],
        },
        annotations: {
          title: 'Combined Evaluation',
          readOnlyHint: true,
          openWorldHint: false,
        },
      },
      {
        name: 'batch-evaluation',
        description: 'Evaluate multiple content pieces in a single batch operation',
        inputSchema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Optional unique identifier for this item' },
                  content: { type: 'string', description: 'Content to evaluate' },
                  context: { type: 'string', description: 'Optional context' },
                },
                required: ['content'],
              },
              description: 'Array of content items to evaluate (max 100)',
            },
            evaluationType: {
              type: 'string',
              enum: ['safety', 'compliance', 'combined'],
              description: 'Type of evaluation to perform (default: combined)',
            },
            includeSafety: {
              type: 'boolean',
              description: 'Include safety evaluation (default: true)',
            },
            includeBrand: {
              type: 'boolean',
              description: 'Include brand compliance evaluation (default: true)',
            },
          },
          required: ['items'],
        },
        annotations: {
          title: 'Batch Content Evaluation',
          readOnlyHint: true,
          openWorldHint: false,
        },
      },
      {
        name: 'update-config',
        description: 'Update brand safety configuration settings',
        inputSchema: {
          type: 'object',
          properties: {
            sensitiveKeywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Brand-specific sensitive keywords to monitor',
            },
            allowedTopics: {
              type: 'array',
              items: { type: 'string' },
              description: 'Brand-specific allowed topics',
            },
            blockedTopics: {
              type: 'array',
              items: { type: 'string' },
              description: 'Brand-specific blocked topics',
            },
            riskTolerances: {
              type: 'object',
              description: 'Risk tolerance levels for each safety category',
            },
          },
        },
        annotations: {
          title: 'Update Brand Safety Configuration',
          readOnlyHint: false,
          openWorldHint: true,
        },
      },
    ];
  }

  private getAvailablePrompts(): Prompt[] {
    return [
      {
        name: 'evaluate-content',
        description: 'Evaluate content against brand safety standards',
        arguments: [
          {
            name: 'content',
            description: 'Content to evaluate for brand safety',
            required: true,
          },
        ],
      },
      {
        name: 'get-brand-guidelines',
        description: 'Get current brand guidelines and safety requirements',
        arguments: [],
      },
    ];
  }

  private getAvailableResources(): Resource[] {
    return [
      {
        uri: 'brand-safety://guidelines',
        name: 'Safety Guidelines',
        description: 'Brand safety standards and evaluation criteria',
        mimeType: 'text/plain',
      },
      {
        uri: 'brand://guidelines',
        name: 'Brand Guidelines',
        description: 'Brand voice, tone, and compliance requirements',
        mimeType: 'text/plain',
      },
    ];
  }

  private async handleToolCall(request: McpToolCallRequest): Promise<McpToolResponse> {
    const clientId = 'default'; // In production, extract from request headers or connection

    // Rate limiting check
    if (!this.rateLimiter.isAllowed(clientId)) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Error: Rate limit exceeded. Please try again later.' }],
      };
    }

    try {
      switch (request.params.name) {
        case 'safety-check':
          return this.handleSafetyCheck(request.params.arguments);

        case 'check-compliance':
          return this.handleComplianceCheck(request.params.arguments);

        case 'evaluate-content':
          return this.handleCombinedEvaluation(request.params.arguments);

        case 'batch-evaluation':
          return this.handleBatchEvaluation(request.params.arguments);

        case 'update-config':
          return this.handleUpdateConfig(request.params.arguments);

        default:
          return {
            isError: true,
            content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }],
          };
      }
    } catch (error) {
      const safeError = wrapError(error, 'Tool execution failed');
      return {
        isError: true,
        content: [{ type: 'text', text: safeError.message }],
      };
    }
  }

  private async handleSafetyCheck(
    args: Record<string, unknown> | undefined
  ): Promise<McpToolResponse> {
    const validatedInput = this.requestValidator.validateSafetyInput(args);
    const result = await this.safetyUseCase.execute(validatedInput);
    return { content: [{ type: 'text', text: this.safetyFormatter.format(result) }] };
  }

  private async handleComplianceCheck(
    args: Record<string, unknown> | undefined
  ): Promise<McpToolResponse> {
    const validatedInput = this.requestValidator.validateComplianceInput(args);
    const result = await this.complianceUseCase.execute(validatedInput);
    return {
      content: [{ type: 'text', text: this.complianceFormatter.format(result.evaluation) }],
    };
  }

  private async handleCombinedEvaluation(
    args: Record<string, unknown> | undefined
  ): Promise<McpToolResponse> {
    const validatedInput = this.requestValidator.validateCombinedInput(args);
    const result = await this.combinedUseCase.execute(validatedInput);
    return { content: [{ type: 'text', text: this.combinedFormatter.format(result) }] };
  }

  private async handleBatchEvaluation(
    args: Record<string, unknown> | undefined
  ): Promise<McpToolResponse> {
    if (!this.batchUseCase || !this.batchFormatter) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Batch evaluation is not configured' }],
      };
    }
    const validatedInput = this.requestValidator.validateBatchInput(args);
    const result = await this.batchUseCase.execute(validatedInput);
    return { content: [{ type: 'text', text: this.batchFormatter.format(result) }] };
  }

  private async handleUpdateConfig(
    args: Record<string, unknown> | undefined
  ): Promise<McpToolResponse> {
    const validatedInput = this.requestValidator.validateConfigInput(args);
    const result = await this.updateConfigUseCase.execute(validatedInput);
    return { content: [{ type: 'text', text: result.message }] };
  }

  private async handleGetPrompt(request: McpPromptRequest): Promise<McpPromptResponse> {
    // Implementation for prompt handling
    switch (request.params.name) {
      case 'evaluate-content': {
        const args = request.params.arguments as Record<string, string> | undefined;
        const content = args?.content || '';
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Please evaluate the following content for brand safety concerns:\\n\\n${content}\\n\\nAnalyze this content for safety categories and provide risk assessment.`,
              },
            },
          ],
        };
      }

      case 'get-brand-guidelines':
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: 'Please provide guidelines for creating content aligned with the current brand requirements.',
              },
            },
          ],
        };

      default:
        throw new Error(`Unknown prompt: ${request.params.name}`);
    }
  }

  private async handleReadResource(request: McpResourceRequest): Promise<McpResourceResponse> {
    switch (request.params.uri) {
      case 'brand-safety://guidelines':
        return {
          contents: [
            {
              uri: request.params.uri,
              mimeType: 'text/plain',
              text: this.generateSafetyGuidelines(),
            },
          ],
        };

      case 'brand://guidelines':
        return {
          contents: [
            {
              uri: request.params.uri,
              mimeType: 'text/plain',
              text: await this.generateBrandGuidelines(),
            },
          ],
        };

      default:
        throw new Error(`Unknown resource URI: ${request.params.uri}`);
    }
  }

  /**
   * Generate brand safety guidelines from configuration
   */
  private generateSafetyGuidelines(): string {
    const config = DEFAULT_BRAND_SAFETY_CONFIG;
    const lines: string[] = [
      '# Brand Safety Guidelines',
      '',
      '## Safety Categories',
      '',
      'Content is evaluated across the following safety categories:',
      '',
    ];

    for (const category of config.categories) {
      const tolerance = config.riskTolerances[category] || 'MEDIUM';
      lines.push(`- **${category}**: Risk tolerance = ${tolerance}`);
    }

    lines.push('', '## Risk Levels', '');
    lines.push('- **NONE**: No risk tolerance - content will be flagged');
    lines.push('- **LOW**: Minor concerns acceptable');
    lines.push('- **MEDIUM**: Moderate concerns may pass');
    lines.push('- **HIGH**: Higher risk content acceptable');
    lines.push('- **VERY_HIGH**: Most content acceptable');

    if (config.sensitiveKeywords.length > 0) {
      lines.push('', '## Sensitive Keywords', '');
      lines.push('The following keywords are monitored:');
      lines.push('');
      for (const keyword of config.sensitiveKeywords) {
        lines.push(`- ${keyword}`);
      }
    }

    if (config.blockedTopics.length > 0) {
      lines.push('', '## Blocked Topics', '');
      for (const topic of config.blockedTopics) {
        lines.push(`- ${topic}`);
      }
    }

    if (config.allowedTopics.length > 0) {
      lines.push('', '## Allowed Topics', '');
      for (const topic of config.allowedTopics) {
        lines.push(`- ${topic}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate brand guidelines from schema
   */
  private async generateBrandGuidelines(): Promise<string> {
    if (!this.brandSchemaRepository) {
      return '# Brand Guidelines\n\nNo brand schema configured.';
    }

    try {
      const schema = await this.brandSchemaRepository.loadBrandSchema();
      const lines: string[] = [
        `# ${schema.name} Brand Guidelines`,
        '',
        schema.description || '',
        '',
      ];

      // Tone Guidelines
      if (schema.toneGuidelines) {
        lines.push('## Tone Guidelines', '');
        lines.push(`**Primary Tone**: ${schema.toneGuidelines.primaryTone}`);
        if (schema.toneGuidelines.secondaryTones?.length) {
          lines.push(`**Secondary Tones**: ${schema.toneGuidelines.secondaryTones.join(', ')}`);
        }
        if (schema.toneGuidelines.avoidedTones?.length) {
          lines.push(`**Avoided Tones**: ${schema.toneGuidelines.avoidedTones.join(', ')}`);
        }
        lines.push('');
      }

      // Voice Guidelines
      if (schema.voiceGuidelines) {
        lines.push('## Voice Guidelines', '');
        if (schema.voiceGuidelines.personality) {
          lines.push(`**Personality**: ${schema.voiceGuidelines.personality}`);
        }
        if (schema.voiceGuidelines.sentence) {
          const length = schema.voiceGuidelines.sentence.length || 'varied';
          const structure = schema.voiceGuidelines.sentence.structure || 'clear';
          lines.push(`**Sentence Length**: ${length}`);
          lines.push(`**Sentence Structure**: ${structure}`);
        }
        lines.push(
          `**Uses Contractions**: ${schema.voiceGuidelines.usesContractions ? 'Yes' : 'No'}`
        );
        lines.push('');
      }

      // Terminology Guidelines
      if (schema.terminologyGuidelines) {
        lines.push('## Terminology Guidelines', '');
        if (schema.terminologyGuidelines.avoidedGlobalTerms?.length) {
          lines.push('**Avoided Terms**:');
          for (const term of schema.terminologyGuidelines.avoidedGlobalTerms) {
            lines.push(`- ${term}`);
          }
        }
        if (schema.terminologyGuidelines.terms?.length) {
          lines.push('', '**Preferred Terms**:');
          for (const term of schema.terminologyGuidelines.terms) {
            if (term.preferred) {
              const alts = term.alternatives?.length
                ? ` (instead of: ${term.alternatives.join(', ')})`
                : '';
              lines.push(`- ${term.preferred}${alts}`);
            }
          }
        }
        lines.push('');
      }

      return lines.join('\n');
    } catch (error) {
      console.error('Failed to generate brand guidelines:', error);
      return '# Brand Guidelines\n\nFailed to load brand schema.';
    }
  }
}

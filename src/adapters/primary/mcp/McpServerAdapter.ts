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
  Resource
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
import { RateLimiter, SafeError, wrapError } from '../../../utils/security.js';

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
    private readonly requestValidator: McpRequestValidator
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
        version: '1.0.1'
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
          resources: {}
        }
      }
    );
  }

  private setupRequestHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: this.getAvailableTools() };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return this.handleToolCall(request);
    });

    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return { prompts: this.getAvailablePrompts() };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      return this.handleGetPrompt(request);
    });

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return { resources: this.getAvailableResources() };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return this.handleReadResource(request);
    });
  }

  private getAvailableTools(): Tool[] {
    return [
      {
        name: 'Safety_Check',
        description: 'Analyze text content for brand safety concerns',
        inputSchema: {
          type: 'object',
          properties: {
            content: { 
              type: 'string', 
              description: 'The content to evaluate for brand safety' 
            },
            context: {
              type: 'string',
              description: 'Optional context for the evaluation'
            }
          },
          required: ['content']
        },
        annotations: {
          title: 'Evaluate Content Safety',
          readOnlyHint: true,
          openWorldHint: false
        }
      },
      {
        name: 'Check_Compliance',
        description: 'Evaluate content for compliance with brand guidelines',
        inputSchema: {
          type: 'object',
          properties: {
            content: { 
              type: 'string', 
              description: 'The content to check for brand compliance' 
            },
            context: {
              type: 'string',
              description: 'Optional context for brand guidelines application'
            }
          },
          required: ['content']
        },
        annotations: {
          title: 'Check Brand Compliance',
          readOnlyHint: true,
          openWorldHint: false
        }
      },
      {
        name: 'Content_Evaluation',
        description: 'Perform a combined evaluation for both brand safety and brand compliance',
        inputSchema: {
          type: 'object',
          properties: {
            content: { 
              type: 'string', 
              description: 'The content to evaluate' 
            },
            context: {
              type: 'string',
              description: 'Optional context for the evaluation'
            },
            includeSafety: {
              type: 'boolean',
              description: 'Include safety evaluation (default: true)'
            },
            includeBrand: {
              type: 'boolean', 
              description: 'Include brand compliance evaluation (default: true)'
            },
            brandWeight: {
              type: 'number',
              description: 'Weight for brand compliance score (1.0-5.0, default: 2.0)'
            },
            safetyWeight: {
              type: 'number',
              description: 'Weight for safety score (1.0-5.0, default: 1.0)'
            }
          },
          required: ['content']
        },
        annotations: {
          title: 'Combined Evaluation',
          readOnlyHint: true,
          openWorldHint: false
        }
      },
      {
        name: 'Batch_Evaluation',
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
                  context: { type: 'string', description: 'Optional context' }
                },
                required: ['content']
              },
              description: 'Array of content items to evaluate (max 100)'
            },
            evaluationType: {
              type: 'string',
              enum: ['safety', 'compliance', 'combined'],
              description: 'Type of evaluation to perform (default: combined)'
            },
            includeSafety: {
              type: 'boolean',
              description: 'Include safety evaluation (default: true)'
            },
            includeBrand: {
              type: 'boolean',
              description: 'Include brand compliance evaluation (default: true)'
            }
          },
          required: ['items']
        },
        annotations: {
          title: 'Batch Content Evaluation',
          readOnlyHint: true,
          openWorldHint: false
        }
      },
      {
        name: 'Update_Config',
        description: 'Update brand safety configuration settings',
        inputSchema: {
          type: 'object',
          properties: {
            sensitiveKeywords: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Brand-specific sensitive keywords to monitor'
            },
            allowedTopics: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Brand-specific allowed topics'
            },
            blockedTopics: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Brand-specific blocked topics'
            },
            riskTolerances: { 
              type: 'object',
              description: 'Risk tolerance levels for each safety category'
            }
          }
        },
        annotations: {
          title: 'Update Brand Safety Configuration',
          readOnlyHint: false,
          openWorldHint: true
        }
      }
    ];
  }

  private getAvailablePrompts(): Prompt[] {
    return [
      {
        name: 'evaluate-content',
        description: 'Evaluate content for brand safety concerns',
        arguments: [
          {
            name: 'content',
            description: 'Content to evaluate for brand safety',
            required: true
          }
        ]
      },
      {
        name: 'get-brand-guidelines',
        description: 'Get guidelines for the active brand',
        arguments: []
      }
    ];
  }

  private getAvailableResources(): Resource[] {
    return [
      {
        uri: 'brand-safety://guidelines',
        name: 'Brand Safety Guidelines',
        description: 'Guidelines for evaluating content against brand safety standards',
        mimeType: 'text/plain'
      },
      {
        uri: 'brand://guidelines',
        name: 'Brand Guidelines',
        description: 'Guidelines for brand compliance',
        mimeType: 'text/plain'
      }
    ];
  }

  private async handleToolCall(request: any) {
    const clientId = 'default'; // In production, extract from request headers or connection
    
    // Rate limiting check
    if (!this.rateLimiter.isAllowed(clientId)) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Error: Rate limit exceeded. Please try again later.' }]
      };
    }

    try {
      switch (request.params.name) {
        case 'Safety_Check':
          return this.handleSafetyCheck(request.params.arguments);
        
        case 'Check_Compliance':
          return this.handleComplianceCheck(request.params.arguments);
        
        case 'Content_Evaluation':
          return this.handleCombinedEvaluation(request.params.arguments);
        
        case 'Batch_Evaluation':
          return this.handleBatchEvaluation(request.params.arguments);
        
        case 'Update_Config':
          return this.handleUpdateConfig(request.params.arguments);
        
        default:
          return {
            isError: true,
            content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }]
          };
      }
    } catch (error) {
      const safeError = wrapError(error, 'Tool execution failed');
      return {
        isError: true,
        content: [{ type: 'text', text: safeError.message }]
      };
    }
  }

  private async handleSafetyCheck(args: any) {
    const validatedInput = this.requestValidator.validateSafetyInput(args);
    const result = await this.safetyUseCase.execute(validatedInput);
    return { content: [{ type: 'text', text: this.safetyFormatter.format(result) }] };
  }

  private async handleComplianceCheck(args: any) {
    const validatedInput = this.requestValidator.validateComplianceInput(args);
    const result = await this.complianceUseCase.execute(validatedInput);
    return { content: [{ type: 'text', text: this.complianceFormatter.format(result.evaluation) }] };
  }

  private async handleCombinedEvaluation(args: any) {
    const validatedInput = this.requestValidator.validateCombinedInput(args);
    const result = await this.combinedUseCase.execute(validatedInput);
    return { content: [{ type: 'text', text: this.combinedFormatter.format(result) }] };
  }

  private async handleBatchEvaluation(args: any) {
    if (!this.batchUseCase || !this.batchFormatter) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Batch evaluation is not configured' }]
      };
    }
    const validatedInput = this.requestValidator.validateBatchInput(args);
    const result = await this.batchUseCase.execute(validatedInput);
    return { content: [{ type: 'text', text: this.batchFormatter.format(result) }] };
  }

  private async handleUpdateConfig(args: any) {
    const validatedInput = this.requestValidator.validateConfigInput(args);
    const result = await this.updateConfigUseCase.execute(validatedInput);
    return { content: [{ type: 'text', text: result.message }] };
  }

  private async handleGetPrompt(request: any) {
    // Implementation for prompt handling
    switch (request.params.name) {
      case 'evaluate-content':
        const content = request.params.arguments?.content || '';
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: `Please evaluate the following content for brand safety concerns:\\n\\n${content}\\n\\nAnalyze this content for safety categories and provide risk assessment.`
            }
          }]
        };
      
      case 'get-brand-guidelines':
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: 'Please provide guidelines for creating content aligned with the current brand requirements.'
            }
          }]
        };
      
      default:
        throw new Error(`Unknown prompt: ${request.params.name}`);
    }
  }

  private async handleReadResource(request: any) {
    // Implementation for resource reading
    switch (request.params.uri) {
      case 'brand-safety://guidelines':
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: 'text/plain',
            text: 'Brand safety guidelines content...' // This would be generated dynamically
          }]
        };
      
      case 'brand://guidelines':
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: 'text/plain',
            text: 'Brand guidelines content...' // This would be generated dynamically
          }]
        };
      
      default:
        throw new Error(`Unknown resource URI: ${request.params.uri}`);
    }
  }
}
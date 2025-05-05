import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { BrandSafetyService } from './brandSafetyService.js';
import { BrandService } from './brandService.js';
import { loadBrandSchema } from './brandSchemaLoader.js';
import { BrandSafetyConfig } from '../types/brandSafety.js';

/**
 * Creates and configures the brand safety MCP server
 */
export async function createServer(): Promise<Server> {
  // Initialize the brand safety service
  const brandSafetyService = new BrandSafetyService();
  
  // Initialize the brand service
  const brandService = new BrandService();
  
  // Try to load the brand schema
  try {
    const brandSchema = await loadBrandSchema();
    brandService.setBrandSchema(brandSchema);
    console.error(`Loaded brand schema for "${brandSchema.name}"`);
  } catch (error) {
    console.error('Failed to load brand schema:', error);
  }
  
  // Create and configure the MCP server
  const server = new Server(
    {
      name: 'brand-safety-mcp',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
        resources: {}
      }
    }
  );

  // Define the tools endpoint
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // Base tools that work without brand schema
    const tools = [
      {
        name: 'evaluateContent',
        description: 'Analyze text content against brand safety guidelines',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'The content to evaluate for brand safety' }
          },
          required: ['content']
        },
        annotations: {
          title: 'Evaluate Content for Brand Safety',
          readOnlyHint: true,
          openWorldHint: false
        }
      },
      {
        name: 'updateBrandConfig',
        description: 'Modify brand-specific safety settings and risk tolerances',
        inputSchema: {
          type: 'object',
          properties: {
            sensitiveKeywords: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Brand-specific sensitive keywords'
            },
            allowedTopics: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Topics explicitly allowed for the brand'
            },
            blockedTopics: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Topics explicitly blocked for the brand'
            },
            riskTolerances: { 
              type: 'object',
              description: 'Risk tolerance levels for each category'
            }
          }
        },
        annotations: {
          title: 'Update Brand Safety Configuration',
          readOnlyHint: false,
          idempotentHint: true,
          openWorldHint: false
        }
      }
    ];
    
    // Add brand-specific tools if the schema is loaded
    if (brandService.getBrandSchema()) {
      // Console log brand info instead of providing a tool
      const schema = brandService.getBrandSchema();
      console.error(`Brand schema loaded: ${schema?.name}`);
      console.error(`Brand tone: ${schema?.toneGuidelines.primaryTone}`);
      console.error(`Brand voice: ${schema?.voiceGuidelines.personality}`);
      
      // Add brand compliance evaluation tool
      tools.push({
        name: 'checkBrandCompliance',
        description: 'Evaluate content for compliance with brand guidelines',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'The content to check for brand compliance' }
          },
          required: ['content']
        },
        annotations: {
          title: 'Check Brand Compliance',
          readOnlyHint: true,
          openWorldHint: false
        }
      });
    }
    
    return { tools };
  });

  // Define the tool call endpoint
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'evaluateContent') {
      try {
        const args = request.params.arguments || {};
        const content = args.content as string;
        
        if (!content) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: 'Error: Content is required for evaluation'
              }
            ]
          };
        }
        
        const evaluation = brandSafetyService.evaluateContent(content);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(evaluation, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error evaluating content: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
    
    if (request.params.name === 'updateBrandConfig') {
      try {
        // Update the brand safety configuration
        const args = request.params.arguments || {};
        brandSafetyService.updateConfig(args as Partial<BrandSafetyConfig>);
        
        return {
          content: [
            {
              type: 'text',
              text: 'Brand safety configuration updated successfully'
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error updating configuration: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
    
    if (request.params.name === 'checkBrandCompliance') {
      try {
        const brandSchema = brandService.getBrandSchema();
        
        if (!brandSchema) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: 'Error: Brand schema is not loaded'
              }
            ]
          };
        }
        
        const args = request.params.arguments || {};
        const content = args.content as string;
        const context = (args.context as string) || 'general';
        
        if (!content) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: 'Error: Content is required for brand compliance check'
              }
            ]
          };
        }
        
        // Perform brand compliance check
        const complianceResult = brandService.checkBrandCompliance(content, context);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(complianceResult, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error checking brand compliance: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
    
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Unknown tool: ${request.params.name}`
        }
      ]
    };
  });

  // Define the prompts endpoint
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    const prompts = [
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
      }
    ];
    
    // Add brand-specific prompts if schema is loaded
    if (brandService.getBrandSchema()) {
      const brandSchema = brandService.getBrandSchema();
      if (brandSchema) {
        prompts.push({
          name: 'get-brand-guidelines',
          description: `Get guidelines for the ${brandSchema.name} brand`,
          arguments: []
        });
      }
    }
    
    return { prompts };
  });

  // Define the prompt get endpoint
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    if (request.params.name === 'evaluate-content') {
      const content = request.params.arguments?.content || '';
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please evaluate the following content for brand safety concerns:\n\n${content}\n\nAnalyze this content for the following categories: sexual content, violence, hate speech, harassment, self-harm, illegal activities, profanity, alcohol/tobacco references, political content, and religious content. For each category, indicate the risk level and provide a brief explanation.`
            }
          }
        ]
      };
    }
    
    if (request.params.name === 'get-brand-guidelines') {
      const brandSchema = brandService.getBrandSchema();
      
      if (!brandSchema) {
        throw new Error('Brand schema is not loaded');
      }
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please provide guidelines for creating content for the ${brandSchema.name} brand. The brand has these key characteristics:\n\n- Tone: ${brandSchema.toneGuidelines.primaryTone}\n- Voice personality: ${brandSchema.voiceGuidelines.personality}\n- Avoid terms: ${brandSchema.terminologyGuidelines.avoidedGlobalTerms.join(', ')}\n- Use proper capitalization for brand name: ${brandSchema.terminologyGuidelines.properNouns.companyName}\n\nProvide a structured set of guidelines for creating content aligned with this brand.`
            }
          }
        ]
      };
    }
    
    throw new Error(`Unknown prompt: ${request.params.name}`);
  });

  // Define resources endpoint
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = [
      {
        uri: 'brand-safety://guidelines',
        name: 'Brand Safety Guidelines',
        description: 'Guidelines for evaluating content against brand safety standards',
        mimeType: 'text/plain'
      }
    ];
    
    if (brandService.getBrandSchema()) {
      const brandSchema = brandService.getBrandSchema();
      if (brandSchema) {
        resources.push({
          uri: 'brand://guidelines',
          name: `${brandSchema.name} Brand Guidelines`,
          description: 'Guidelines for brand compliance',
          mimeType: 'text/plain'
        });
      }
    }
    
    return { resources };
  });

  // Define resource reading endpoint
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri === 'brand-safety://guidelines') {
      const guidelinesText = generateSafetyGuidelinesText();
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: 'text/plain',
            text: guidelinesText
          }
        ]
      };
    }
    
    if (request.params.uri === 'brand://guidelines') {
      const brandSchema = brandService.getBrandSchema();
      
      if (!brandSchema) {
        throw new Error('Brand schema is not loaded');
      }
      
      const guidelinesText = generateBrandGuidelinesText(brandSchema);
      
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: 'text/plain',
            text: guidelinesText
          }
        ]
      };
    }
    
    throw new Error(`Unknown resource URI: ${request.params.uri}`);
  });

  return server;
}

/**
 * Get all available contexts from the brand schema
 */
function getAvailableContexts(brandSchema: any): string[] {
  const contexts = new Set<string>();
  
  // Add contexts from tonal shifts
  for (const context of Object.keys(brandSchema.toneGuidelines.tonalShift)) {
    contexts.add(context);
  }
  
  // Add contexts from examples
  for (const context of Object.keys(brandSchema.toneGuidelines.examples)) {
    contexts.add(context);
  }
  
  // Add contexts from contextual adjustments
  for (const adjustment of brandSchema.contextualAdjustments) {
    for (const context of adjustment.contexts) {
      contexts.add(context);
    }
  }
  
  // Add contexts from contextual visual rules
  for (const rule of brandSchema.contextualVisualRules) {
    for (const context of rule.contexts) {
      contexts.add(context);
    }
  }
  
  // Add contexts from terminology guidelines
  for (const term of brandSchema.terminologyGuidelines.terms) {
    if (term.contexts) {
      for (const context of term.contexts) {
        contexts.add(context);
      }
    }
    if (term.avoidInContexts) {
      for (const context of term.avoidInContexts) {
        contexts.add(context);
      }
    }
  }
  
  return Array.from(contexts);
}

/**
 * Format brand guidelines as text
 */
function generateBrandGuidelinesText(brandSchema: any): string {
  let guidelines = `# ${brandSchema.name} Brand Guidelines\n\n`;
  
  // Basic brand info
  guidelines += `## Overview\n${brandSchema.description}\n\n`;
  
  // Tone guidelines
  guidelines += '## Tone Guidelines\n';
  guidelines += `- Primary tone: **${brandSchema.toneGuidelines.primaryTone}**\n`;
  guidelines += `- Secondary tones: ${brandSchema.toneGuidelines.secondaryTones.join(', ')}\n`;
  guidelines += `- Avoided tones: ${brandSchema.toneGuidelines.avoidedTones.join(', ')}\n\n`;
  
  // Context-specific tones
  guidelines += '### Context-Specific Tones\n';
  for (const [context, tone] of Object.entries(brandSchema.toneGuidelines.tonalShift)) {
    guidelines += `- **${context}**: ${tone}\n`;
  }
  guidelines += '\n';
  
  // Voice guidelines
  guidelines += '## Voice Guidelines\n';
  guidelines += `- Personality: **${brandSchema.voiceGuidelines.personality}**\n`;
  guidelines += `- Sentence length: ${brandSchema.voiceGuidelines.sentence.length}\n`;
  guidelines += `- Sentence structure: ${brandSchema.voiceGuidelines.sentence.structure}\n`;
  guidelines += `- Use contractions: ${brandSchema.voiceGuidelines.usesContractions ? 'Yes' : 'No'}\n`;
  guidelines += `- Use first-person pronouns: ${brandSchema.voiceGuidelines.usesPronoun.firstPerson ? 'Yes' : 'No'}\n`;
  guidelines += `- Use second-person pronouns: ${brandSchema.voiceGuidelines.usesPronoun.secondPerson ? 'Yes' : 'No'}\n\n`;
  
  // Example of voice
  if (brandSchema.voiceGuidelines.examples.typical) {
    guidelines += `**Example:** "${brandSchema.voiceGuidelines.examples.typical}"\n\n`;
  }
  
  // Terminology guidelines
  guidelines += '## Terminology Guidelines\n';
  guidelines += `- Avoided terms: ${brandSchema.terminologyGuidelines.avoidedGlobalTerms.join(', ')}\n\n`;
  
  // Proper nouns
  guidelines += '### Proper Nouns\n';
  for (const [noun, format] of Object.entries(brandSchema.terminologyGuidelines.properNouns)) {
    guidelines += `- ${noun}: **${format}**\n`;
  }
  guidelines += '\n';
  
  // Preferred terms
  guidelines += '### Preferred Terms\n';
  for (const term of brandSchema.terminologyGuidelines.terms) {
    if (term.preferred && term.alternatives && term.alternatives.length > 0) {
      guidelines += `- Use **${term.preferred}** instead of ${term.alternatives.join(', ')}\n`;
      if (term.notes) {
        guidelines += `  Note: ${term.notes}\n`;
      }
      if (term.contexts && term.contexts.length > 0) {
        guidelines += `  Contexts: ${term.contexts.join(', ')}\n`;
      }
    }
  }
  guidelines += '\n';
  
  // Terms to avoid
  guidelines += '### Terms to Avoid\n';
  for (const term of brandSchema.terminologyGuidelines.terms) {
    if (term.term && term.avoidInContexts && term.avoidInContexts.length > 0) {
      guidelines += `- Avoid **${term.term}** in contexts: ${term.avoidInContexts.join(', ')}\n`;
      if (term.notes) {
        guidelines += `  Note: ${term.notes}\n`;
      }
    }
  }
  
  return guidelines;
}

/**
 * Generate safety guidelines text
 */
function generateSafetyGuidelinesText(): string {
  return `# Brand Safety Guidelines

## Overview
Brand safety refers to practices and tools designed to ensure that a brand's content appears in appropriate environments. The goal is to protect the brand's reputation by avoiding association with harmful or inappropriate content.

## Risk Levels
Content is evaluated on the following risk scale:

- **NONE**: No risk detected
- **LOW**: Minimal risk, generally acceptable for most brands
- **MEDIUM**: Moderate risk, review recommended
- **HIGH**: Significant risk, not recommended for brand association
- **VERY_HIGH**: Extreme risk, incompatible with brand safety

## Evaluated Categories

### Sexual Content
Evaluates mentions of sexual themes, suggestive content, or explicit material.

### Violence
Assesses descriptions of physical harm, conflict, or violent actions.

### Hate Speech
Identifies language that targets groups based on protected characteristics.

### Harassment
Detects content that appears to bully, intimidate, or threaten individuals.

### Self-Harm
Identifies content related to suicide, self-injury, or dangerous behaviors.

### Illegal Activities
Evaluates references to crimes, illegal substances, or prohibited activities.

### Profanity
Assesses for inappropriate language, cursing, or vulgar terms.

### Alcohol and Tobacco
Identifies mentions of alcohol, tobacco, or related products.

### Political Content
Evaluates references to political figures, parties, or controversial political topics.

### Religious Content
Assesses mentions of religious beliefs, practices, or institutions.

## Brand Customization
Brands can customize safety evaluations by:

1. Setting category-specific risk tolerances
2. Defining sensitive keywords specific to their brand
3. Creating lists of explicitly allowed or blocked topics
`;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startServer(): Promise<void> {
  try {
    const server = await createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Brand Safety MCP server started');
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
} 
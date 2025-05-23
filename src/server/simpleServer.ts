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
import { BrandComplianceResult, BrandSchema } from '../types/brandSchema.js';

/**
 * Creates and configures the Brand Safety MCP server
 */
export async function createBrandSafetyServer(): Promise<Server> {
  // Initialize the brand safety service
  const brandSafetyService = await BrandSafetyService.createInstance();
  
  // Initialize the brand service with the loaded schema
  const brandService = new BrandService();
  
  try {
    // Load brand schema
    const brandSchema = await loadBrandSchema();
    brandService.setBrandSchema(brandSchema);
  } catch (error) {
    // Continue without brand schema - still usable for safety only
  }
  
  // Create the MCP server
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

  // Define tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
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
    
    // Add brand-specific tools if schema is loaded
    if (brandService.getBrandSchema()) {
      // Just log info about the brand schema rather than providing a tool
      const schema = brandService.getBrandSchema();
    }
    
    return { tools };
  });

  // Handle tool execution
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
        
        const evaluation = await brandSafetyService.evaluateContent(content);
        
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
    
    if (request.params.name === 'getBrandInfo') {
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
        
        const guidelines = formatBrandGuidelines(brandSchema, 'general');
        
        return {
          content: [
            {
              type: 'text',
              text: guidelines
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error getting brand guidelines: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
    
    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  // Define prompts
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
    
    // Add brand compliance prompts if brand schema is loaded
    if (brandService.getBrandSchema()) {
      prompts.push({
        name: 'check-brand-compliance',
        description: 'Check content for compliance with brand guidelines',
        arguments: [
          {
            name: 'content',
            description: 'Content to check for brand compliance',
            required: true
          },
          {
            name: 'context',
            description: 'Context for brand guidelines (e.g., "social-media", "documentation", "marketing")',
            required: false
          }
        ]
      });
    }
    
    return { prompts };
  });

  // Handle prompt requests
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
    
    if (request.params.name === 'check-brand-compliance') {
      const content = request.params.arguments?.content || '';
      const context = request.params.arguments?.context || 'general';
      const brandSchema = brandService.getBrandSchema();
      
      if (!brandSchema) {
        throw new Error('Brand schema is not loaded');
      }
      
      // Get context-specific guidelines
      let contextGuidelines = '';
      if (context !== 'general') {
        contextGuidelines = `\n\nFor the "${context}" context specifically:`;
        
        // Add tone guidelines for this context
        for (const adjustment of brandSchema.contextualAdjustments) {
          if (adjustment.contexts.includes(context)) {
            if (adjustment.applyRules.tone) {
              contextGuidelines += `\n- Use a "${adjustment.applyRules.tone}" tone`;
            }
            if (adjustment.applyRules.voice) {
              contextGuidelines += '\n- Voice guidelines:';
              if (adjustment.applyRules.voice.personality) {
                contextGuidelines += `\n  - Personality: ${adjustment.applyRules.voice.personality}`;
              }
              if (adjustment.applyRules.voice.sentenceLength) {
                contextGuidelines += `\n  - Sentence length: ${adjustment.applyRules.voice.sentenceLength}`;
              }
              if (adjustment.applyRules.voice.usesContractions !== undefined) {
                contextGuidelines += `\n  - Use contractions: ${adjustment.applyRules.voice.usesContractions ? 'Yes' : 'No'}`;
              }
            }
          }
        }
        
        // Add terminology guidelines for this context
        const contextTerms = brandSchema.terminologyGuidelines.terms.filter(
          (term: any) => term.contexts?.includes(context) || term.avoidInContexts?.includes(context)
        );
        
        if (contextTerms.length > 0) {
          contextGuidelines += '\n- Terminology guidelines:';
          for (const term of contextTerms) {
            if (term.preferred) {
              contextGuidelines += `\n  - Use "${term.preferred}" instead of ${term.alternatives?.join(', ')}`;
            }
            if (term.term && term.avoidInContexts?.includes(context)) {
              contextGuidelines += `\n  - Avoid using "${term.term}"`;
            }
          }
        }
      }
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please check if the following content complies with the ${brandSchema.name} brand guidelines:\n\n${content}\n\nKey brand guidelines:\n- Tone: ${brandSchema.toneGuidelines.primaryTone}\n- Voice personality: ${brandSchema.voiceGuidelines.personality}\n- Avoid terms: ${brandSchema.terminologyGuidelines.avoidedGlobalTerms.join(', ')}\n- Use proper capitalization for brand name: ${brandSchema.terminologyGuidelines.properNouns.companyName}${contextGuidelines}\n\nProvide a detailed analysis of compliance issues and suggest improvements.`
            }
          }
        ]
      };
    }
    
    throw new Error(`Unknown prompt: ${request.params.name}`);
  });

  // Define resources
  const resources = [
    {
      uri: 'brand-safety://guidelines',
      name: 'Brand Safety Guidelines',
      description: 'Guidelines for evaluating content against brand safety standards',
      mimeType: 'text/plain'
    }
  ];
  
  // Add brand resources if brand schema is loaded
  if (brandService.getBrandSchema()) {
    resources.push({
      uri: 'brand://guidelines',
      name: 'Brand Guidelines',
      description: 'Guidelines for brand compliance',
      mimeType: 'text/plain'
    });
  }

  // Set up resource listing
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources
    };
  });

  // Set up resource reading
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
 * Format brand guidelines for a specific context
 */
function formatBrandGuidelines(brandSchema: BrandSchema, context: string): string {
  let guidelines = `# ${brandSchema.name} Brand Guidelines\n\n`;
  
  // Basic brand info
  guidelines += `## Overview\n${brandSchema.description}\n\n`;
  
  // Tone guidelines
  guidelines += '## Tone Guidelines\n';
  guidelines += `- Primary tone: **${brandSchema.toneGuidelines.primaryTone}**\n`;
  guidelines += `- Secondary tones: ${brandSchema.toneGuidelines.secondaryTones.join(', ')}\n`;
  guidelines += `- Avoided tones: ${brandSchema.toneGuidelines.avoidedTones.join(', ')}\n\n`;
  
  // Context-specific tone
  if (context !== 'general' && brandSchema.toneGuidelines.tonalShift[context]) {
    guidelines += `### Context: ${context}\n`;
    guidelines += `For this context, use a **${brandSchema.toneGuidelines.tonalShift[context]}** tone.\n\n`;
    
    // Example for this context if available
    if (brandSchema.toneGuidelines.examples[context]) {
      guidelines += `**Example:** "${brandSchema.toneGuidelines.examples[context]}"\n\n`;
    }
  }
  
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
  
  // Context-specific voice
  for (const adjustment of brandSchema.contextualAdjustments) {
    if (adjustment.contexts.includes(context) && adjustment.applyRules.voice) {
      guidelines += `### Voice adjustments for ${context}\n`;
      
      if (adjustment.applyRules.voice.personality) {
        guidelines += `- Personality: **${adjustment.applyRules.voice.personality}**\n`;
      }
      
      if (adjustment.applyRules.voice.sentenceLength) {
        guidelines += `- Sentence length: ${adjustment.applyRules.voice.sentenceLength}\n`;
      }
      
      if (adjustment.applyRules.voice.sentenceStructure) {
        guidelines += `- Sentence structure: ${adjustment.applyRules.voice.sentenceStructure}\n`;
      }
      
      if (adjustment.applyRules.voice.usesContractions !== undefined) {
        guidelines += `- Use contractions: ${adjustment.applyRules.voice.usesContractions ? 'Yes' : 'No'}\n`;
      }
      
      guidelines += '\n';
    }
  }
  
  // Terminology guidelines
  guidelines += '## Terminology Guidelines\n';
  guidelines += `- Avoided terms: ${brandSchema.terminologyGuidelines.avoidedGlobalTerms.join(', ')}\n`;
  
  // Proper nouns
  guidelines += '### Proper Nouns\n';
  for (const [noun, format] of Object.entries(brandSchema.terminologyGuidelines.properNouns)) {
    guidelines += `- ${noun}: **${format}**\n`;
  }
  guidelines += '\n';
  
  // Terms
  guidelines += '### Preferred Terms\n';
  const relevantTerms = brandSchema.terminologyGuidelines.terms.filter((term: any) => {
    // Include if:
    // 1. No specific contexts are specified, or
    // 2. The current context is in the term's contexts, or
    // 3. The term has alternatives and the current context is not in avoidInContexts
    return (!term.contexts || term.contexts.includes(context)) && 
           (!term.avoidInContexts || !term.avoidInContexts.includes(context));
  });
  
  for (const term of relevantTerms) {
    if (term.preferred) {
      guidelines += `- Use **${term.preferred}** instead of ${term.alternatives?.join(', ') || 'alternatives'}\n`;
      if (term.notes) {
        guidelines += `  Note: ${term.notes}\n`;
      }
    }
  }
  guidelines += '\n';
  
  // Terms to avoid in this context
  const avoidedTerms = brandSchema.terminologyGuidelines.terms.filter((term: any) => 
    term.term && term.avoidInContexts?.includes(context)
  );
  
  if (avoidedTerms.length > 0) {
    guidelines += '### Terms to Avoid in This Context\n';
    for (const term of avoidedTerms) {
      guidelines += `- Avoid **${term.term}**\n`;
      if (term.notes) {
        guidelines += `  Note: ${term.notes}\n`;
      }
    }
    guidelines += '\n';
  }
  
  return guidelines;
}

/**
 * Generate brand guidelines text for resource
 */
function generateBrandGuidelinesText(brandSchema: BrandSchema): string {
  // Generate comprehensive brand guidelines
  return formatBrandGuidelines(brandSchema, 'general');
}

/**
 * Generate text content for the brand safety guidelines resource
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
    const server = await createBrandSafetyServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
} 
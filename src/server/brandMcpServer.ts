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
import { BrandComplianceResult } from '../types/brandSchema.js';
import { BrandSafetyEvaluation, ContentSafetyResult, RiskLevel } from '../types/brandSafety.js';

/**
 * Creates and configures the brand safety MCP server
 */
export async function createServer(): Promise<Server> {
  // Initialize the brand safety service
  const brandSafetyService = await BrandSafetyService.createInstance();
  
  // Initialize the brand service
  const brandService = new BrandService();
  
  // Try to load the brand schema
  try {
    const brandSchema = await loadBrandSchema();
    brandService.setBrandSchema(brandSchema);
  } catch (error) {
  }
  
  // Create and configure the MCP server
  const server = new Server(
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

  // Define the tools endpoint
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // Base tools that work without brand schema
    const tools = [
      {
        name: 'Safety_Check',
        description: 'Analyze text content for brand safety concerns',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'The content to evaluate for brand safety' }
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
    
    // Add brand-specific tools if the schema is loaded
    if (brandService.getBrandSchema()) {
      // Console log brand info instead of providing a tool
      const schema = brandService.getBrandSchema();
      
      // Add brand compliance evaluation tool
      tools.push({
        name: 'Check_Compliance',
        description: 'Evaluate content for compliance with brand guidelines',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'The content to check for brand compliance' }
          },
          required: ['content']
        } as any,
        annotations: {
          title: 'Check Brand Compliance',
          readOnlyHint: true,
          openWorldHint: false
        }
      });
      
      // Add new combined evaluation tool
      tools.push({
        name: 'Content_Evaluation',
        description: 'Perform a combined evaluation for both brand safety and brand compliance',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'The content to evaluate' }
          },
          required: ['content']
        } as any,
        annotations: {
          title: 'Combined Evaluation',
          readOnlyHint: true,
          openWorldHint: false
        }
      });
    }
    
    return { tools };
  });

  // Define the tool call endpoint
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'Safety_Check') {
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
        const formattedResponse = formatSafetyEvaluation(evaluation);
        
        return {
          content: [
            {
              type: 'text',
              text: formattedResponse
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
    
    if (request.params.name === 'Update_Config') {
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
    
    if (request.params.name === 'Check_Compliance') {
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
        const formattedResponse = formatBrandCompliance(complianceResult);
        
        return {
          content: [
            {
              type: 'text',
              text: formattedResponse
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
    
    // Handle the evaluateContentWithBrand tool
    if (request.params.name === 'Content_Evaluation') {
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
        const brandWeight = parseFloat((args.brandWeight as string) || '2.0'); 
        const safetyWeight = parseFloat((args.safetyWeight as string) || '1.0');
        const includeSafety = args.includeSafety !== 'false';
        const includeBrand = args.includeBrand !== 'false';
        
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
        
        // Normalize weights to valid range
        const normalizedBrandWeight = Math.max(1.0, Math.min(5.0, brandWeight));
        const normalizedSafetyWeight = Math.max(1.0, Math.min(5.0, safetyWeight));
        
        // Initialize the combined result
        const combinedResult: any = {
          content,
          timestamp: new Date().toISOString()
        };
        
        // Perform evaluations based on flags
        if (includeSafety) {
          combinedResult.safety = brandSafetyService.evaluateContent(content);
        }
        
        if (includeBrand) {
          combinedResult.brand = brandService.checkBrandCompliance(content, context);
        }
        
        // Only calculate combined score if both evaluations were performed
        if (includeSafety && includeBrand) {
          // Convert safety risk level to a numeric score (inverse - higher is better)
          const safetyLevels: Record<string, number> = {
            'NONE': 100,
            'LOW': 80,
            'MEDIUM': 60,
            'HIGH': 30,
            'VERY_HIGH': 0
          };
          
          const safetyScore = safetyLevels[combinedResult.safety.overallRisk] || 50;
          const brandScore = combinedResult.brand.complianceScore;
          
          // Apply weights to the scores
          const weightedSafetyScore = safetyScore * normalizedSafetyWeight;
          const weightedBrandScore = brandScore * normalizedBrandWeight;
          const totalWeight = normalizedSafetyWeight + normalizedBrandWeight;
          
          // Calculate combined score (weighted average)
          const combinedScore = Math.round((weightedSafetyScore + weightedBrandScore) / totalWeight);
          
          // Determine overall compliance
          const isCompliant = combinedScore >= 70;
          
          combinedResult.combinedScore = combinedScore;
          combinedResult.isCompliant = isCompliant;
          combinedResult.weights = {
            brand: normalizedBrandWeight,
            safety: normalizedSafetyWeight
          };
          
          // Generate overall summary
          if (isCompliant) {
            combinedResult.summary = `COMPLIANT: Content achieves a combined score of ${combinedScore}. It aligns sufficiently with both safety guidelines and brand requirements.`;
          } else {
            const brandIssues = combinedResult.brand.isCompliant ? [] : [`brand compliance issues (${combinedResult.brand.complianceScore})`];
            const safetyIssues = (combinedResult.safety.overallRisk === 'NONE' || combinedResult.safety.overallRisk === 'LOW') ? [] : [`safety concerns (${combinedResult.safety.overallRisk})`];
            const issues = [...brandIssues, ...safetyIssues].join(' and ');
            
            combinedResult.summary = `NON-COMPLIANT: Content has a combined score of ${combinedScore} due to ${issues}. Review recommended before use.`;
          }
        }
        
        const formattedResponse = formatCombinedEvaluation(combinedResult);
        
        return {
          content: [
            {
              type: 'text',
              text: formattedResponse
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

// Helper functions for formatting human-readable responses

/**
 * Format brand safety evaluation result as human-readable text
 */
function formatSafetyEvaluation(evaluation: BrandSafetyEvaluation): string {
  // Get risk color indicator
  const riskColors = {
    'NONE': '✅ SAFE',
    'LOW': '🟢 LOW RISK',
    'MEDIUM': '🟡 CAUTION',
    'HIGH': '🔴 HIGH RISK',
    'VERY_HIGH': '⛔ UNSAFE'
  };
  
  const riskIndicator = riskColors[evaluation.overallRisk] || evaluation.overallRisk;
  
  // Format the header
  let result = `# Brand Safety Evaluation\n\n`;
  result += `## Overall Assessment: ${riskIndicator}\n\n`;
  result += `${evaluation.summary}\n\n`;
  
  // Format the categories with issues
  const categoriesWithIssues = evaluation.evaluations.filter(
    item => item.riskLevel !== 'NONE' && item.riskLevel !== 'LOW'
  );
  
  if (categoriesWithIssues.length > 0) {
    result += `## Areas of Concern\n\n`;
    
    for (const category of categoriesWithIssues) {
      const riskIndicator = riskColors[category.riskLevel] || category.riskLevel;
      result += `### ${category.category}: ${riskIndicator}\n`;
      result += `${category.explanation}\n\n`;
    }
  }
  
  // Format safe categories
  const safeCategories = evaluation.evaluations.filter(
    item => item.riskLevel === 'NONE' || item.riskLevel === 'LOW'
  );
  
  if (safeCategories.length > 0) {
    result += `## Safe Categories\n\n`;
    result += safeCategories.map(cat => `- ${cat.category}`).join('\n');
    result += '\n\n';
  }
  
  return result;
}

/**
 * Format brand compliance result as human-readable text
 */
function formatBrandCompliance(result: BrandComplianceResult): string {
  // Determine compliance status indicator
  const statusIndicator = result.isCompliant 
    ? '✅ COMPLIANT' 
    : (result.complianceScore >= 60 ? '🟡 NEEDS IMPROVEMENT' : '❌ NON-COMPLIANT');
  
  // Format the header
  let output = `# Brand Compliance Evaluation\n\n`;
  output += `## Overall Assessment: ${statusIndicator} (Score: ${result.complianceScore}/100)\n\n`;
  output += `${result.summary}\n\n`;
  
  // Group issues by type
  const issuesByType: Record<string, typeof result.issues> = {};
  
  for (const issue of result.issues) {
    if (!issuesByType[issue.type]) {
      issuesByType[issue.type] = [];
    }
    issuesByType[issue.type].push(issue);
  }
  
  // Display issues if any exist
  if (result.issues.length > 0) {
    output += `## Issues Found\n\n`;
    
    // Display each issue type with its issues
    for (const [type, issues] of Object.entries(issuesByType)) {
      output += `### ${type.charAt(0).toUpperCase() + type.slice(1)} Issues\n\n`;
      
      for (const issue of issues) {
        const severityIndicator = 
          issue.severity === 'high' ? '🔴' : 
          (issue.severity === 'medium' ? '🟡' : '🟢');
        
        output += `${severityIndicator} **${issue.description}**\n`;
        output += `   - Suggestion: ${issue.suggestion}\n\n`;
      }
    }
  } else {
    output += `✅ No issues found. Content is fully compliant with ${result.brandName} brand guidelines.\n\n`;
  }
  
  // Add context information
  if (result.context) {
    output += `*Evaluation context: ${result.context}*\n\n`;
  }
  
  return output;
}

/**
 * Format combined evaluation result as human-readable text
 */
function formatCombinedEvaluation(result: any): string {
  // Create the header with overall result
  let output = `# Combined Brand and Safety Evaluation\n\n`;
  
  // If we have a combined score
  if (result.combinedScore !== undefined) {
    const statusIndicator = result.isCompliant 
      ? '✅ COMPLIANT' 
      : '❌ NON-COMPLIANT';
    
    output += `## Overall Assessment: ${statusIndicator} (Score: ${result.combinedScore}/100)\n\n`;
    output += `${result.summary}\n\n`;
    
    // Show weights used
    output += `*Using weights: Brand ${result.weights.brand}x, Safety ${result.weights.safety}x*\n\n`;
  }
  
  // Include brand compliance section if available
  if (result.brand) {
    output += `## Brand Compliance\n\n`;
    output += `Score: ${result.brand.complianceScore}/100 - ${result.brand.isCompliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}\n\n`;
    
    // Only show issues if there are any
    if (result.brand.issues && result.brand.issues.length > 0) {
      output += `### Issues Found\n\n`;
      
      // Group issues by type
      const issuesByType: Record<string, any[]> = {};
      
      for (const issue of result.brand.issues) {
        if (!issuesByType[issue.type]) {
          issuesByType[issue.type] = [];
        }
        issuesByType[issue.type].push(issue);
      }
      
      // Display each issue type with its issues
      for (const [type, issues] of Object.entries(issuesByType)) {
        output += `#### ${type.charAt(0).toUpperCase() + type.slice(1)} Issues\n\n`;
        
        for (const issue of issues) {
          const severityIndicator = 
            issue.severity === 'high' ? '🔴' : 
            (issue.severity === 'medium' ? '🟡' : '🟢');
          
          output += `${severityIndicator} **${issue.description}**\n`;
          output += `   - Suggestion: ${issue.suggestion}\n\n`;
        }
      }
    } else {
      output += `✅ No brand issues found.\n\n`;
    }
  }
  
  // Include safety evaluation section if available
  if (result.safety) {
    output += `## Safety Evaluation\n\n`;
    
    const riskColors: Record<string, string> = {
      'NONE': '✅ SAFE',
      'LOW': '🟢 LOW RISK',
      'MEDIUM': '🟡 CAUTION',
      'HIGH': '🔴 HIGH RISK',
      'VERY_HIGH': '⛔ UNSAFE'
    };
    
    const riskIndicator = riskColors[result.safety.overallRisk] || result.safety.overallRisk;
    output += `Overall Risk: ${riskIndicator}\n\n`;
    
    // Format the categories with issues
    const categoriesWithIssues = result.safety.evaluations.filter(
      (item: any) => item.riskLevel !== 'NONE' && item.riskLevel !== 'LOW'
    );
    
    if (categoriesWithIssues.length > 0) {
      output += `### Areas of Concern\n\n`;
      
      for (const category of categoriesWithIssues) {
        const riskIndicator = riskColors[category.riskLevel] || category.riskLevel;
        output += `#### ${category.category}: ${riskIndicator}\n`;
        output += `${category.explanation}\n\n`;
      }
    } else {
      output += `✅ No safety concerns detected.\n\n`;
    }
  }
  
  return output;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startServer(): Promise<void> {
  try {
    const server = await createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    process.exit(1);
  }
} 
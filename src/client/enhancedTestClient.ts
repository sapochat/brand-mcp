import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Enhanced test client to showcase the improved brand compliance checking
 */
async function main() {
  try {
    console.log('Starting Enhanced Test Client...');
    
    // Initialize the client transport (pointing to the server)
    const serverPath = path.resolve(process.cwd(), 'dist', 'index.js');
    const transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath]
    });

    // Create and initialize the client
    const client = new Client({
      name: 'enhanced-test-client',
      version: '1.0.0'
    });

    // Connect to the brand safety server
    await client.connect(transport);
    console.log('Connected to Brand Safety MCP server\n');

    // Load some test content
    const testCases = [
      {
        name: 'Technical Documentation',
        content: `Our advanced API uses REST architecture with JSON payloads for efficient data transfer. 
        The client interface communicates with the server backend using HTTP protocols. 
        The authentication system implements OAuth 2.0 for secure access control.
        Our sophisticated algorithm processes data in real-time, leveraging the framework's capabilities.`,
        context: 'technical-documentation'
      },
      {
        name: 'Marketing Copy',
        content: `We're excited to announce our revolutionary new product! 
        This synergistic solution will completely disrupt the market and leverage your existing infrastructure.
        Our cutting-edge technology is the most powerful in the industry, guaranteed to transform your business.
        Obviously, you'll want to take advantage of this limited-time offer.`,
        context: 'marketing'
      },
      {
        name: 'Professional Communication',
        content: `Thank you for your inquiry about our services. 
        We're confident that our solution will meet your requirements. 
        Our team has extensive expertise in implementing enterprise-grade systems.
        We look forward to discussing how we can help you achieve your goals.`,
        context: 'general'
      },
      {
        name: 'Condescending Technical Support',
        content: `As everyone knows, you simply need to restart your computer to fix this problem.
        It's obviously a user error - the software works fine on our end.
        Just follow the basic steps in the manual that clearly explain the process.
        Even a beginner could figure this out with minimal effort.`,
        context: 'technical-support'
      }
    ];

    // Test each case with the enhanced brand compliance checker
    for (const testCase of testCases) {
      console.log(`\n============= Testing: ${testCase.name} =============`);
      console.log('Content:');
      console.log(testCase.content);
      console.log('\nChecking brand compliance...');
      
      try {
        const complianceResult = await client.callTool({
          name: 'checkBrandCompliance',
          arguments: {
            content: testCase.content,
            context: testCase.context
          }
        });
        
        // Handle the result
        const resultContent = complianceResult.content;
        if (Array.isArray(resultContent) && resultContent.length > 0 && typeof resultContent[0].text === 'string') {
          const resultData = JSON.parse(resultContent[0].text);
          console.log(`\nCompliance Score: ${resultData.complianceScore}/100`);
          console.log(`Status: ${resultData.isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`);
          console.log(`Content Type Detected: ${resultData.contentType || 'Unknown'}`);
          
          if (resultData.issues && resultData.issues.length > 0) {
            console.log('\nIssues Found:');
            for (const issue of resultData.issues) {
              const severityColor = 
                issue.severity === 'high' ? '\x1b[31m' :    // Red
                issue.severity === 'medium' ? '\x1b[33m' :  // Yellow
                '\x1b[32m';                                // Green
              
              console.log(`${severityColor}[${issue.severity.toUpperCase()}]\x1b[0m ${issue.type}: ${issue.description}`);
              console.log(`  Suggestion: ${issue.suggestion}`);
            }
          } else {
            console.log('\nNo issues found!');
          }
          
          console.log(`\nSummary: ${resultData.summary}`);
        }
      } catch (error) {
        console.error('Error checking brand compliance:', error);
      }
    }

    // Show how to use the combined evaluation with weights
    console.log('\n============= Testing Combined Evaluation =============');
    const marketingContent = testCases[1].content;
    
    console.log('Testing different weight configurations:');
    const configs = [
      { brandWeight: 3.0, safetyWeight: 1.0, label: 'Brand Prioritized' },
      { brandWeight: 1.0, safetyWeight: 3.0, label: 'Safety Prioritized' },
      { brandWeight: 1.0, safetyWeight: 1.0, label: 'Equal Weights' }
    ];
    
    for (const config of configs) {
      console.log(`\n--- ${config.label} ---`);
      
      try {
        const result = await client.callTool({
          name: 'evaluateContentWithBrand',
          arguments: {
            content: marketingContent,
            context: 'marketing',
            brandWeight: config.brandWeight.toString(),
            safetyWeight: config.safetyWeight.toString()
          }
        });
        
        // Handle the result
        const resultContent = result.content;
        if (Array.isArray(resultContent) && resultContent.length > 0 && typeof resultContent[0].text === 'string') {
          const resultData = JSON.parse(resultContent[0].text);
          console.log(`Combined Score: ${resultData.combinedScore}/100`);
          console.log(`Weights Used: Brand ${resultData.weights?.brand}x, Safety ${resultData.weights?.safety}x`);
          console.log(`Status: ${resultData.isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`);
          console.log(`Summary: ${resultData.summary}`);
        }
      } catch (error) {
        console.error('Error with combined evaluation:', error);
      }
    }

    // Test reporting false positives
    console.log('\n============= Demonstrating False Positive Reporting =============');
    console.log('This would be used in a real system to improve detection accuracy over time.');
    console.log('Example code:');
    console.log(`
  // In your application code:
  const falsePositiveIssue = {
    type: 'terminology',
    severity: 'high',
    description: 'Content uses globally avoided term: "leverage"',
    suggestion: 'Remove or replace the term "leverage"'
  };
  
  // Report this as a false positive
  brandService.addFalsePositive(falsePositiveIssue, technicalContent);
  
  // After several reports, detection parameters will be automatically adjusted
    `);

    // End the test
    await transport.close();
    console.log('\nEnhanced test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 
import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Starting SDK Example Client...');
  
  // Start the MCP server as a separate process
  const serverProcess = spawn('node', ['dist/index.js'], {
    stdio: 'pipe' // Capture I/O for communication
  });
  
  // Allow server startup time
  console.log('Waiting for server to start...');
  await sleep(2000);
  
  try {
    // Initialize the client - use MCP protocol over stdio
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/index.js']
    });
    
    // Create the client
    const client = new Client({
      name: 'sdk-example-client',
      version: '1.0.0'
    });
    
    // Connect to the server
    console.log('Connecting to server...');
    await client.connect(transport);
    console.log('Successfully connected to MCP server.');
    
    // List the available tools
    console.log('\nAvailable tools:');
    const toolsResult = await client.listTools();
    console.log(JSON.stringify(toolsResult, null, 2));
    
    // Example content for testing
    const brandCompliantText = "We're excited to share our latest breakthrough with you! This innovative new feature will transform your workflow with its cutting-edge capabilities.";
    const brandNonCompliantText = "This disruptive technology leverages synergy to create a paradigm shift in how you work.";
    
    // Test brand safety evaluation
    console.log('\n--- Testing Brand Safety Evaluation ---');
    try {
      const safetyResult = await client.callTool({
        name: 'evaluateContent',
        arguments: {
          content: brandNonCompliantText
        }
      });
      
      // Handle the content type safely
      const safetyContent = safetyResult.content;
      if (Array.isArray(safetyContent) && safetyContent.length > 0 && typeof safetyContent[0].text === 'string') {
        console.log('Safety evaluation result:');
        const safetyData = JSON.parse(safetyContent[0].text);
        console.log(`- Overall risk: ${safetyData.overallRisk}`);
        console.log(`- Summary: ${safetyData.summary}`);
        
        // Show categories with detected risks
        const risksDetected = safetyData.evaluations.filter((evaluation: any) => evaluation.riskLevel !== 'NONE');
        if (risksDetected.length > 0) {
          console.log('- Risks detected:');
          for (const risk of risksDetected) {
            console.log(`  * ${risk.category}: ${risk.riskLevel} - ${risk.explanation}`);
          }
        }
      }
    } catch (error) {
      console.error('Error during safety evaluation:', error);
    }
    
    // Test brand compliance evaluation
    console.log('\n--- Testing Brand Compliance Evaluation ---');
    try {
      // Check non-compliant text
      const nonCompliantResult = await client.callTool({
        name: 'checkBrandCompliance',
        arguments: {
          content: brandNonCompliantText,
          context: 'general'
        }
      });
      
      // Handle the content type safely
      const nonCompliantContent = nonCompliantResult.content;
      if (Array.isArray(nonCompliantContent) && nonCompliantContent.length > 0 && typeof nonCompliantContent[0].text === 'string') {
        console.log('Non-compliant text evaluation:');
        const nonCompliantData = JSON.parse(nonCompliantContent[0].text);
        console.log(`- Compliance score: ${nonCompliantData.complianceScore}%`);
        console.log(`- Is compliant: ${nonCompliantData.isCompliant}`);
        console.log(`- Summary: ${nonCompliantData.summary}`);
        
        if (nonCompliantData.issues && nonCompliantData.issues.length > 0) {
          console.log('- Issues found:');
          for (const issue of nonCompliantData.issues) {
            console.log(`  * [${issue.type}/${issue.severity}] ${issue.description}`);
            console.log(`    Suggestion: ${issue.suggestion}`);
          }
        }
      }
      
      // Check compliant text
      const compliantResult = await client.callTool({
        name: 'checkBrandCompliance',
        arguments: {
          content: brandCompliantText,
          context: 'general'
        }
      });
      
      // Handle the content type safely
      const compliantContent = compliantResult.content;
      if (Array.isArray(compliantContent) && compliantContent.length > 0 && typeof compliantContent[0].text === 'string') {
        console.log('\nCompliant text evaluation:');
        const compliantData = JSON.parse(compliantContent[0].text);
        console.log(`- Compliance score: ${compliantData.complianceScore}%`);
        console.log(`- Is compliant: ${compliantData.isCompliant}`);
        console.log(`- Summary: ${compliantData.summary}`);
      }
    } catch (error) {
      console.error('Error during brand compliance evaluation:', error);
    }
    
    // Test context-specific compliance
    console.log('\n--- Testing Context-Specific Compliance ---');
    const contextSpecificText = "Hey folks! Check out this awesome new feature. It's super cool and really easy to use!";
    
    try {
      // Check text in social media context
      const socialResult = await client.callTool({
        name: 'checkBrandCompliance',
        arguments: {
          content: contextSpecificText,
          context: 'social-media'
        }
      });
      
      // Handle the content type safely
      const socialContent = socialResult.content;
      if (Array.isArray(socialContent) && socialContent.length > 0 && typeof socialContent[0].text === 'string') {
        console.log('Social media context evaluation:');
        const socialData = JSON.parse(socialContent[0].text);
        console.log(`- Compliance score: ${socialData.complianceScore}%`);
        console.log(`- Is compliant: ${socialData.isCompliant}`);
        console.log(`- Summary: ${socialData.summary}`);
      }
      
      // Check same text in technical documentation context
      const technicalResult = await client.callTool({
        name: 'checkBrandCompliance',
        arguments: {
          content: contextSpecificText,
          context: 'technical-documentation'
        }
      });
      
      // Handle the content type safely
      const technicalContent = technicalResult.content;
      if (Array.isArray(technicalContent) && technicalContent.length > 0 && typeof technicalContent[0].text === 'string') {
        console.log('\nTechnical documentation context evaluation:');
        const technicalData = JSON.parse(technicalContent[0].text);
        console.log(`- Compliance score: ${technicalData.complianceScore}%`);
        console.log(`- Is compliant: ${technicalData.isCompliant}`);
        console.log(`- Summary: ${technicalData.summary}`);
      }
    } catch (error) {
      console.error('Error during context-specific evaluation:', error);
    }
    
    console.log('\nExample completed successfully. Shutting down...');
    // Close the connection properly
    await transport.close();
    serverProcess.kill();
  } catch (error) {
    console.error('Error:', error);
    serverProcess.kill();
    process.exit(1);
  }
}

// Run the example client
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 
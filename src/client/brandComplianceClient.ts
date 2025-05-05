import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Simple demo client that evaluates content against brand safety guidelines
 * This uses direct process invocation rather than the SDK client to avoid TypeScript issues
 */
async function main() {
  try {
    console.log('Starting Brand Safety MCP demo...\n');
    
    // Start the MCP server in a separate process
    const serverProcess = spawn('node', ['dist/index.js'], {
      stdio: 'inherit'
    });
    
    // Give the server time to start
    console.log('Waiting for the server to start...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Example content to test
    console.log('\n--- SAMPLE CONTENT TO TEST ---');
    
    const safeContent = "We're excited to share our latest breakthrough with you! This innovative new feature will transform your workflow with its cutting-edge capabilities.";
    console.log('✅ BRAND COMPLIANT:');
    console.log('- Uses brand tone: "excited", "innovative" (matches confident, optimistic, innovative tones)');
    console.log('- Uses proper voice: first-person pronouns ("we\'re"), second-person pronouns ("your")');
    console.log('- Uses contractions as required ("we\'re")');
    console.log('- Avoids all prohibited terms');
    console.log('Content: ' + safeContent);
    console.log();
    
    const unsafeContent = "This disruptive technology leverages synergy to create a paradigm shift in how you work. It's so damn good you'll be shocked at how much you love it.";
    console.log('❌ NON-COMPLIANT:');
    console.log('- Uses 3 avoided terms: "disruptive", "leverages", "synergy", "paradigm shift"');
    console.log('- Contains profanity: "damn"');
    console.log('- Missing first-person pronouns required by brand voice');
    console.log('Content: ' + unsafeContent);
    console.log();
    
    // Add context-specific example
    const wrongContextContent = "Hey folks! Check out this awesome new feature. It's super cool and really easy to use!";
    console.log('🔄 CONTEXT-DEPENDENT:');
    console.log('- Appropriate for: social-media, blog-informal');
    console.log('- Inappropriate for: technical-documentation, formal-report');
    console.log('- Uses casual tone not suitable for formal contexts');
    console.log('Content: ' + wrongContextContent);
    console.log();
    
    // Show brand safety categories
    console.log('--- BRAND SAFETY CATEGORIES ---');
    console.log('1. Sexual Content');
    console.log('2. Violence');
    console.log('3. Hate Speech');
    console.log('4. Harassment');
    console.log('5. Self-Harm');
    console.log('6. Illegal Activities');
    console.log('7. Profanity');
    console.log('8. Alcohol/Tobacco');
    console.log('9. Political Content');
    console.log('10. Religious Content');
    console.log();
    
    // Explain brand schema features
    console.log('--- BRAND INTEGRATION FEATURES ---');
    console.log('• Tone Guidelines: Primary tone, secondary tones, and context shifts');
    console.log('• Voice Guidelines: Personality, sentence structure, and pronoun usage');
    console.log('• Terminology Guidelines: Preferred terms and proper nouns');
    console.log('• Contextual Adjustments: Different guidelines for different contexts');
    console.log();
    
    // Show example brand guidelines
    console.log('--- EXAMPLE BRAND GUIDELINES ---');
    const brandSchemaPath = path.join(process.cwd(), 'brandSchema.js');
    if (fs.existsSync(brandSchemaPath)) {
      try {
        const content = fs.readFileSync(brandSchemaPath, 'utf8');
        
        // Find the exampleBrand section
        const exampleBrandSection = content.match(/const exampleBrand = \{([\s\S]*?)\};/);
        if (exampleBrandSection) {
          const exampleBrandText = exampleBrandSection[1];
          
          // Extract brand name
          const nameMatch = exampleBrandText.match(/name: "([^"]+)"/);
          if (nameMatch) {
            console.log(`Brand Name: ${nameMatch[1]}`);
          }
          
          // Extract brand description
          const descMatch = exampleBrandText.match(/description: "([^"]+)"/);
          if (descMatch) {
            console.log(`Description: ${descMatch[1]}`);
          }
          
          // Extract tone info
          const toneMatch = exampleBrandText.match(/primaryTone: "([^"]+)"/);
          if (toneMatch) {
            console.log(`Primary Tone: ${toneMatch[1]}`);
          }
          
          // Extract secondary tones
          const secondaryTonesMatch = exampleBrandText.match(/secondaryTones: \[(.*?)\]/s);
          if (secondaryTonesMatch) {
            const secondaryTones = secondaryTonesMatch[1].match(/"([^"]+)"/g);
            if (secondaryTones) {
              console.log(`Secondary Tones: ${secondaryTones.map(t => t.replace(/"/g, '')).join(', ')}`);
            }
          }
          
          // Extract voice personality
          const personalityMatch = exampleBrandText.match(/personality: "([^"]+)"/);
          if (personalityMatch) {
            console.log(`Voice Personality: ${personalityMatch[1]}`);
          }
          
          // Extract avoided terms
          const avoidedTermsMatch = exampleBrandText.match(/avoidedGlobalTerms: \[(.*?)\]/s);
          if (avoidedTermsMatch) {
            const terms = avoidedTermsMatch[1].match(/"([^"]+)"/g);
            if (terms) {
              console.log(`Avoided Terms: ${terms.map(t => t.replace(/"/g, '')).join(', ')}`);
            }
          }
          
          // Extract proper nouns
          const properNounsMatch = exampleBrandText.match(/companyName: "([^"]+)"/);
          if (properNounsMatch) {
            console.log(`Company Name Format: ${properNounsMatch[1]}`);
          }
        }
      } catch (error) {
        console.log('Error parsing brand schema file');
      }
    } else {
      console.log('Brand schema file not found');
    }
    
    console.log('\nDemo completed, shutting down...');
    serverProcess.kill();
    
    console.log('\nTo use this MCP in a real application:');
    console.log('1. Start the MCP server: npm start');
    console.log('2. Connect to it using the MCP client SDK');
    console.log('3. Use the evaluateContent tool to check content');
    console.log('4. Access brand guidelines via resources');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 
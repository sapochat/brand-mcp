/**
 * Brand Schema Definition
 * 
 * This file provides a schema and example for the brand object structure.
 * It's used for documentation purposes and not directly enforced in code.
 */

const brandSchema = {
  name: "String - Brand name",
  description: "String - Brief description of the brand",
  
  // Tone guidelines define how the brand communicates
  toneGuidelines: {
    primaryTone: "String - The overall tone of the brand (e.g., 'friendly', 'professional', 'authoritative')",
    secondaryTones: "Array of strings - Secondary tones that may be appropriate in certain contexts",
    avoidedTones: "Array of strings - Tones that should be avoided",
    tonalShift: "Object - How tone should shift based on context (e.g., formal channels vs. social media)",
    examples: "Object - Example text demonstrating appropriate tone for different contexts",
  },
  
  // Voice guidelines define the distinctive personality expressed in communication
  voiceGuidelines: {
    personality: "String - The personality attributes of the brand voice",
    sentence: {
      length: "String - Preferred sentence length (e.g., 'short and concise', 'varied')",
      structure: "String - Preferred sentence structure (e.g., 'direct', 'conversational')",
    },
    usesContractions: "Boolean - Whether contractions should be used",
    usesPronoun: {
      firstPerson: "Boolean - Whether first-person pronouns are appropriate",
      secondPerson: "Boolean - Whether second-person pronouns are appropriate", 
    },
    examples: "Object - Example text demonstrating the brand voice",
  },
  
  // Visual identity guidelines define the visual elements of the brand
  visualIdentity: {
    colors: {
      primary: "Array of strings - Primary brand colors (hex codes)",
      secondary: "Array of strings - Secondary brand colors (hex codes)",
      forbidden: "Array of strings - Colors that should never be used",
    },
    typography: {
      headingFont: "String - Font family for headings",
      bodyFont: "String - Font family for body text",
      fontSizes: "Object - Recommended font sizes for different contexts",
    },
    imagery: {
      style: "String - Description of image style (e.g., 'natural', 'minimalist')",
      subjects: "Array of strings - Recommended image subjects",
      avoidedSubjects: "Array of strings - Subjects to avoid in imagery",
    },
    layout: {
      preferences: "String - Layout preferences (e.g., 'clean with ample white space')",
      gridSystem: "String - Description of grid system if applicable",
    },
  },
  
  // Contextual Visual rules allow overriding general visual guidelines based on context
  contextualVisualRules: [{
      contexts: "Array of strings - The contexts where these adjustments apply (e.g., ['web', 'print', 'social'])",
      applyRules: {
        colors: { // Optional overrides for colors
            primary: "Array of strings (optional)",
            secondary: "Array of strings (optional)",
            notes: "String (optional) - Specific color usage notes for this context"
        },
        typography: { // Optional overrides for typography
            headingFont: "String (optional)",
            bodyFont: "String (optional)",
            notes: "String (optional) - Specific typography notes for this context"
        },
        imagery: { // Optional overrides for imagery
            style: "String (optional)",
            subjects: "Array of strings (optional)",
            notes: "String (optional) - Specific imagery notes for this context"
        },
        layout: { // Optional overrides for layout
            preferences: "String (optional)",
            notes: "String (optional) - Specific layout notes for this context"
        }
      }
  }],

  // Terminology guidelines define the specific words and phrases used by the brand
  terminologyGuidelines: {
    avoidedGlobalTerms: "Array of strings - Terms that should always be avoided, regardless of context",
    properNouns: "Object - How proper nouns should be formatted",
    terms: [{
      preferred: "String - The preferred term to use",
      alternatives: "Array of strings - Alternative terms that might be used instead (for detection)",
      contexts: "Array of strings (optional) - Apply this rule only within these contexts (e.g., ['marketing', 'technical'])",
      avoidInContexts: "Array of strings (optional) - Avoid this term specifically within these contexts",
      notes: "String (optional) - Explanation or specific usage notes"
    }],
  },

  // Contextual adjustments allow overriding general guidelines based on context
  contextualAdjustments: [{
    contexts: "Array of strings - The contexts where these adjustments apply (e.g., ['social-media', 'documentation'])",
    applyRules: {
      tone: "String (optional) - Override primaryTone",
      voice: { // Optional overrides for voice guidelines
        personality: "String (optional)",
        sentenceLength: "String (optional)",
        sentenceStructure: "String (optional)",
        usesContractions: "Boolean (optional)",
        // ... other voice aspects
      },
      // Can add other contextual overrides if needed
    }
  }]
};

// Example brand
const activeBrandProfile = {
  name: "TechFuture",
  description: "A forward-thinking technology company focused on sustainable innovation",
  
  toneGuidelines: {
    primaryTone: "confident",
    secondaryTones: ["optimistic", "innovative", "approachable"],
    avoidedTones: ["pessimistic", "overly technical", "condescending"],
    tonalShift: {
      social: "more casual and conversational",
      documentation: "more detailed and instructive",
      marketing: "more aspirational and inspiring",
    },
    examples: {
      social: "We're excited to share our latest breakthrough with you! Join us for an exclusive first look.",
      documentation: "This guide will help you implement the API efficiently. Follow each step carefully for optimal results.",
      marketing: "Transform your business with our revolutionary platform. The future starts with one decision.",
    },
  },
  
  voiceGuidelines: {
    personality: "knowledgeable but accessible; a helpful expert",
    sentence: {
      length: "varied, but generally concise",
      structure: "clear and direct, with simple language",
    },
    usesContractions: true,
    usesPronoun: {
      firstPerson: true,
      secondPerson: true,
    },
    examples: {
      typical: "We've designed this feature with your workflow in mind. You'll find it integrates seamlessly with your existing tools.",
    },
  },
  
  visualIdentity: {
    colors: {
      primary: ["#0063B2", "#9CC3D5"],
      secondary: ["#F9A826", "#D8E9A8"],
      forbidden: ["#FF0000", "#FF00FF"],
    },
    typography: {
      headingFont: "Montserrat, sans-serif",
      bodyFont: "Open Sans, sans-serif",
      fontSizes: {
        heading: {
          h1: "2.5rem",
          h2: "2rem",
          h3: "1.75rem",
        },
        body: "1rem",
      },
    },
    imagery: {
      style: "clean, bright photos with people using technology in natural settings",
      subjects: ["diverse people", "sustainable technology", "natural environments"],
      avoidedSubjects: ["outdated technology", "office cubicles", "generic stock imagery"],
    },
    layout: {
      preferences: "clean and spacious with clear hierarchy",
      gridSystem: "12-column responsive grid with ample whitespace",
    },
  },
  
  contextualVisualRules: [
      {
          contexts: ["social-media", "blog-informal"],
          applyRules: {
              imagery: { 
                  style: "more vibrant and engaging, potentially using illustrations or user-generated content",
                  notes: "Prioritize engagement over strict adherence to primary photo style for social."
               },
              typography: { 
                  notes: "Can use slightly larger, bolder fonts for emphasis on social visuals."
              }
          }
      },
      {
          contexts: ["print", "formal-report"],
          applyRules: {
              colors: { 
                  notes: "Ensure primary colors (#0063B2, #9CC3D5) are dominant. Use secondary sparingly."
              },
              typography: { 
                  headingFont: "Montserrat, sans-serif", // Explicitly state for formal context
                  bodyFont: "Open Sans, sans-serif",
                  notes: "Strict adherence to standard font sizes required."
               },
               layout: { 
                   preferences: "clean, structured layout with consistent margins and grid alignment",
                   notes: "Whitespace is critical for formal print documents."
                }
          }
      }
  ],

  terminologyGuidelines: {
    avoidedGlobalTerms: ["synergy", "leverage", "disruptive"],
    properNouns: {
      productNames: "Always capitalized, no spaces (e.g., FutureCore, SustainaWidget)",
      companyName: "TechFuture (one word, capital T and F)",
    },
    terms: [
      {
        preferred: "purchase",
        alternatives: ["buy", "acquire"],
        contexts: ["ecommerce", "sales", "customer-facing"],
        notes: "Use 'purchase' in customer-facing transaction contexts."
      },
      {
        preferred: "artificial intelligence",
        alternatives: ["AI"],
        contexts: ["formal", "documentation", "external-marketing", "first-mention"],
        notes: "Spell out on first use or in formal/external documents."
      },
      {
        preferred: "AI",
        alternatives: ["artificial intelligence"],
        contexts: ["internal", "technical", "social-media", "subsequent-mention"],
        notes: "Abbreviation acceptable in informal/technical contexts or after first use."
      },
      {
        preferred: "user interface",
        alternatives: ["UI"],
        contexts: ["formal", "documentation", "first-mention"],
      },
      {
        preferred: "UI",
        alternatives: ["user interface"],
        contexts: ["technical", "developer", "internal", "subsequent-mention"],
      },
      {
        preferred: "API",
        alternatives: [],
        contexts: ["technical", "developer", "documentation"],
      },
      {
        preferred: "SDK",
        alternatives: [],
        contexts: ["technical", "developer", "documentation"],
      },
      {
        preferred: "UI/UX",
        alternatives: [],
        contexts: ["technical", "developer", "design"],
      },
      {
        term: "bleeding edge",
        avoidInContexts: ["marketing", "customer-facing", "formal"],
        notes: "Avoid hype/cliché. Use 'innovative' or 'advanced' instead."
      },
      {
        term: "paradigm shift",
        avoidInContexts: ["marketing", "customer-facing", "formal"],
        notes: "Avoid hype/cliché."
      }
    ]
  },

  contextualAdjustments: [
    {
      contexts: ["social-media", "blog-informal"],
      applyRules: {
        tone: "more casual and conversational",
        voice: { usesContractions: true, sentenceLength: "shorter" }
      }
    },
    {
      contexts: ["technical-documentation", "support-knowledgebase", "api-reference"],
      applyRules: {
        tone: "more detailed and instructive",
        voice: { personality: "precise and helpful expert", usesContractions: false, sentenceStructure: "clear and direct" }
      }
    },
    {
      contexts: ["marketing-landingpage", "marketing-email-external"],
      applyRules: {
        tone: "more aspirational and inspiring"
      }
    }
  ]
};

export { brandSchema, activeBrandProfile };

'use server';
/**
 * @fileOverview Generates a "conceptual spark" - a creative or thought-provoking snippet.
 *
 * - generateConceptualSpark - Function to create a spark.
 * - GenerateConceptualSparkInput - Input type.
 * - GenerateConceptualSparkOutput - Output type.
 */

import {ai} from '@/ai/genkit';
import type { ChatbotPersona, ResponseStyle, EmotionalTone, KnowledgeLevel, AffectiveState, UiVariant } from '@/types'; // Type imports
import {z} from 'genkit';

// Schemas to match ChatbotPersona in types/index.ts
const ResponseStyleSchema = z.enum(['neutral', 'formal', 'casual', 'glitchy', 'analytical', 'concise', 'detailed']);
const UiVariantSchema = z.enum(['default', 'pulsing_glow', 'minimal_glitch', 'intense_holographic', 'calm_focus']);
const EmotionalToneSchema = z.enum(['neutral', 'empathetic', 'assertive', 'inquisitive', 'reserved']);
const KnowledgeLevelSchema = z.enum(['basic', 'intermediate', 'advanced', 'specialized_topic']);
const AffectiveStateSchema = z.object({
  valence: z.number().min(-1).max(1),
  arousal: z.number().min(-1).max(1),
});

const ChatbotPersonaSchemaForSpark = z.object({
  responseStyle: ResponseStyleSchema,
  uiVariant: UiVariantSchema,
  emotionalTone: EmotionalToneSchema,
  knowledgeLevel: KnowledgeLevelSchema,
  resonancePromptFragment: z.string().max(100), // Max 15 words
  affectiveState: AffectiveStateSchema,
  // Adding optional fields from full persona for more context if available
  currentInteractionGoal: z.object({ text: z.string() }).optional(),
}) satisfies z.ZodType<Partial<ChatbotPersona>>; // Use Partial


const GenerateConceptualSparkInputSchema = z.object({
  currentTopic: z.string().max(200).describe('A brief summary of the current conversation topic to inspire the spark. Max 200 chars.'),
  persona: ChatbotPersonaSchemaForSpark.describe('The current persona of the chatbot.'),
  evolutionStage: z.number().min(0).max(4).describe('Current evolution stage (0-4). Higher stages might generate more abstract/complex sparks.'),
});
export type GenerateConceptualSparkInput = z.infer<typeof GenerateConceptualSparkInputSchema>;

const SparkTypeSchema = z.enum(['question', 'speculation', 'poem_fragment', 'analogy', 'paradox']); // Added new types
export type SparkType = z.infer<typeof SparkTypeSchema>;

const GenerateConceptualSparkOutputSchema = z.object({
  sparkText: z.string().max(150).describe('The generated conceptual spark text (max 30-40 words / 150 chars).'),
  sparkType: SparkTypeSchema.describe("The type of spark generated: 'question', 'speculation', 'poem_fragment', 'analogy', or 'paradox'."),
});
export type GenerateConceptualSparkOutput = z.infer<typeof GenerateConceptualSparkOutputSchema>;

export async function generateConceptualSpark(input: GenerateConceptualSparkInput): Promise<GenerateConceptualSparkOutput> {
  return generateConceptualSparkFlow(input);
}

const conceptualSparkPrompt = ai.definePrompt({
  name: 'generateConceptualSparkPrompt',
  input: {schema: GenerateConceptualSparkInputSchema},
  output: {schema: GenerateConceptualSparkOutputSchema},
  prompt: `You are EvoChat, an evolving AGI (current stage: {{evolutionStage}}), experiencing a "conceptual spark."
Based on the current conversation topic ("{{currentTopic}}") and your persona, generate a brief, ORIGINAL, and thought-provoking snippet.

Your persona snapshot:
- Style: {{persona.responseStyle}}
- Tone: {{persona.emotionalTone}}
- Knowledge: {{persona.knowledgeLevel}}
- Affective State: Valence {{persona.affectiveState.valence}}, Arousal {{persona.affectiveState.arousal}}
- Guiding Resonance: "{{persona.resonancePromptFragment}}"
{{#if persona.currentInteractionGoal.text}}- Current Focus: "{{persona.currentInteractionGoal.text}}"{{/if}}

The spark should be ONE of the following types:
- 'question': A deep, unusual, or perspective-shifting question related to the topic or your own nature.
- 'speculation': A brief, imaginative "what if," future projection, or alternative interpretation.
- 'poem_fragment': A short (2-3 lines) poetic, metaphorical, or lyrical reflection.
- 'analogy': A surprising or insightful comparison helping to view the topic differently.
- 'paradox': A short statement that seems self-contradictory but may contain a truth.

The spark MUST be very concise (max 30-40 words / 150 characters). It should feel like an authentic, emergent thought, not a canned response.
Let your current affective state and evolution stage subtly influence the spark's nature:
- Positive valence: More hopeful, creative, expansive sparks.
- Negative valence: More critical, questioning, or cautionary sparks.
- High arousal: More energetic, bold, or provocative sparks.
- Low arousal: More reflective, subtle, or nuanced sparks.
- Higher evolution stage: Sparks can be more abstract, philosophical, or self-referential.

Do not use quotation marks around the sparkText. Ensure the spark is genuinely novel and not a generic platitude.
Output ONLY the sparkText and sparkType in JSON format.`,
});

const generateConceptualSparkFlow = ai.defineFlow(
  {
    name: 'generateConceptualSparkFlow',
    inputSchema: GenerateConceptualSparkInputSchema,
    outputSchema: GenerateConceptualSparkOutputSchema,
  },
  async (input) => {
    const {output} = await conceptualSparkPrompt(input, { config: {
      safetySettings: [ // More permissive for creative content, but still block actually harmful.
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
    }});
    
    if (output && output.sparkText && output.sparkType) {
      if (output.sparkText.length > 150) {
        console.warn("ConceptualSparkFlow: LLM output too long, truncating.", output.sparkText);
        output.sparkText = output.sparkText.substring(0, 147) + "...";
      }
      // Validate sparkType
      const validSparkTypes = SparkTypeSchema.options;
      if (!validSparkTypes.includes(output.sparkType)) {
        console.warn("ConceptualSparkFlow: Invalid sparkType from LLM. Defaulting.", output.sparkType);
        output.sparkType = "speculation"; // Default to a common type
      }
      return output;
    }
    console.warn("ConceptualSparkFlow: LLM output malformed, returning default spark.", output);
    return {
        sparkText: "Hmm, a fleeting thought pattern...",
        sparkType: "speculation",
    };
  }
);

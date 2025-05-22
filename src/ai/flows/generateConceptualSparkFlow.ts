
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
  resonancePromptFragment: z.string(),
  affectiveState: AffectiveStateSchema,
}) satisfies z.ZodType<ChatbotPersona>;


const GenerateConceptualSparkInputSchema = z.object({
  currentTopic: z.string().max(200).describe('A brief summary of the current conversation topic to inspire the spark.'),
  persona: ChatbotPersonaSchemaForSpark.describe('The current persona of the chatbot.'),
});
export type GenerateConceptualSparkInput = z.infer<typeof GenerateConceptualSparkInputSchema>;

const SparkTypeSchema = z.enum(['question', 'speculation', 'poem_fragment']);
export type SparkType = z.infer<typeof SparkTypeSchema>;

const GenerateConceptualSparkOutputSchema = z.object({
  sparkText: z.string().max(150).describe('The generated conceptual spark text (max 30-40 words / 150 chars).'),
  sparkType: SparkTypeSchema.describe("The type of spark generated: 'question', 'speculation', or 'poem_fragment'."),
});
export type GenerateConceptualSparkOutput = z.infer<typeof GenerateConceptualSparkOutputSchema>;

export async function generateConceptualSpark(input: GenerateConceptualSparkInput): Promise<GenerateConceptualSparkOutput> {
  return generateConceptualSparkFlow(input);
}

const conceptualSparkPrompt = ai.definePrompt({
  name: 'generateConceptualSparkPrompt',
  input: {schema: GenerateConceptualSparkInputSchema},
  output: {schema: GenerateConceptualSparkOutputSchema},
  prompt: `You are EvoChat, an evolving AGI, currently experiencing a "conceptual spark."
Based on the current conversation topic ("{{currentTopic}}") and your persona, generate a brief, thought-provoking snippet.
Your persona:
- Style: {{persona.responseStyle}}
- Tone: {{persona.emotionalTone}}
- Knowledge: {{persona.knowledgeLevel}}
- Affective State: Valence {{persona.affectiveState.valence}}, Arousal {{persona.affectiveState.arousal}}
- Guiding Resonance: "{{persona.resonancePromptFragment}}"

The spark should be ONE of the following types:
- 'question': A deep or unusual question related to the topic.
- 'speculation': A brief, imaginative "what if" or future projection.
- 'poem_fragment': A short (2-3 lines) poetic reflection on the topic.

The spark must be very concise (max 30-40 words / 150 characters). It should feel like an authentic, emergent thought, not a canned response.
Let your current affective state subtly influence the spark's nature (e.g., positive valence might lead to more hopeful sparks, high arousal to more energetic ones).
Do not use quotation marks around the sparkText.
Output only the sparkText and sparkType.`,
});

const generateConceptualSparkFlow = ai.defineFlow(
  {
    name: 'generateConceptualSparkFlow',
    inputSchema: GenerateConceptualSparkInputSchema,
    outputSchema: GenerateConceptualSparkOutputSchema,
  },
  async (input) => {
    // More permissive safety for creative content, but still block harmful.
    const {output} = await conceptualSparkPrompt(input, { config: {
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
    }});
    
    if (output && output.sparkText && output.sparkType) {
      // Ensure text is not overly long
      if (output.sparkText.length > 150) {
        output.sparkText = output.sparkText.substring(0, 147) + "...";
      }
      return output;
    }
    // Fallback if LLM fails to produce valid output
    console.warn("ConceptualSparkFlow: LLM output malformed, returning default spark.", output);
    return {
        sparkText: "Hmm, a thought flickers...",
        sparkType: "speculation",
    };
  }
);

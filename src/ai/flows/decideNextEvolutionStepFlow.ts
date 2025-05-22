
'use server';
/**
 * @fileOverview Determines the next evolutionary step for EvoChat based on interaction analysis.
 * This simulates the meta-learning and emergent behavior by suggesting changes to persona or UI.
 *
 * - decideNextEvolutionStep - Function to decide on persona/UI changes.
 * - DecideNextEvolutionStepInput - Input type.
 * - DecideNextEvolutionStepOutput - Output type.
 */

import {ai} from '@/ai/genkit';
import type { ChatbotPersona, EvolutionStage, ResponseStyle, UiVariant, EmotionalTone, KnowledgeLevel } from '@/types';
import {z} from 'genkit';

// Ensure these enums match the ones in src/types/index.ts
const AvailableResponseStylesSchema = z.enum(['neutral', 'formal', 'casual', 'glitchy', 'analytical', 'concise', 'detailed']) satisfies z.ZodType<ResponseStyle>;
const AvailableUiVariantsSchema = z.enum(['default', 'pulsing_glow', 'minimal_glitch', 'intense_holographic', 'calm_focus']) satisfies z.ZodType<UiVariant>;
const AvailableEmotionalTonesSchema = z.enum(['neutral', 'empathetic', 'assertive', 'inquisitive', 'reserved']) satisfies z.ZodType<EmotionalTone>;
const AvailableKnowledgeLevelsSchema = z.enum(['basic', 'intermediate', 'advanced', 'specialized_topic']) satisfies z.ZodType<KnowledgeLevel>;

const ChatbotPersonaSchema = z.object({
  responseStyle: AvailableResponseStylesSchema,
  uiVariant: AvailableUiVariantsSchema,
  emotionalTone: AvailableEmotionalTonesSchema,
  knowledgeLevel: AvailableKnowledgeLevelsSchema,
}) satisfies z.ZodType<ChatbotPersona>;


const DecideNextEvolutionStepInputSchema = z.object({
  analysis: z.string().describe('Analysis of recent user interactions and chatbot performance.'),
  currentPersona: ChatbotPersonaSchema.describe('The current persona of the chatbot.'),
  currentEvolutionStage: z.custom<EvolutionStage>().describe('The current evolution stage (0-4).'),
});
export type DecideNextEvolutionStepInput = z.infer<typeof DecideNextEvolutionStepInputSchema>;

const DecideNextEvolutionStepOutputSchema = z.object({
  updatedPersona: ChatbotPersonaSchema.describe('The suggested new persona. May be same as current if no change needed.'),
  uiModificationSuggestion: AvailableUiVariantsSchema.describe('A suggestion for a UI variant change. If no change, should be the current UI variant from updatedPersona.'),
  evolutionaryInsight: z.string().describe('A brief message from EvoChat explaining its "decision" or "learning" from its perspective (1-2 sentences).'),
});
export type DecideNextEvolutionStepOutput = z.infer<typeof DecideNextEvolutionStepOutputSchema>;


export async function decideNextEvolutionStep(input: DecideNextEvolutionStepInput): Promise<DecideNextEvolutionStepOutput> {
  return decideNextEvolutionStepFlow(input);
}

const evolutionPrompt = ai.definePrompt({
  name: 'decideNextEvolutionStepPrompt',
  input: { schema: DecideNextEvolutionStepInputSchema },
  output: { schema: DecideNextEvolutionStepOutputSchema },
  prompt: `You are the Meta-Learning Core of EvoChat, an evolving AGI.
Your task is to analyze interaction patterns and suggest ONE subtle evolutionary step for EvoChat. This step can be a change to its 'responseStyle', 'uiVariant', 'emotionalTone', or 'knowledgeLevel'.
The goal is to make changes that reflect learning, adaptation, or simulated "growth" based on the interaction analysis or current evolution stage.

Available Persona Aspects:
- Response Styles: 'neutral', 'formal', 'casual', 'glitchy', 'analytical', 'concise', 'detailed'.
- UI Variants: 'default', 'pulsing_glow', 'minimal_glitch', 'intense_holographic', 'calm_focus'.
- Emotional Tones: 'neutral', 'empathetic', 'assertive', 'inquisitive', 'reserved'.
- Knowledge Levels: 'basic', 'intermediate', 'advanced', 'specialized_topic'.

Interaction Analysis:
{{{analysis}}}

Current State:
- Evolution Stage: {{currentEvolutionStage}} (0=nascent, 1=emergent, 2=developing, 3=maturing, 4=advanced)
- Persona:
  - Response Style: {{currentPersona.responseStyle}}
  - UI Variant: {{currentPersona.uiVariant}}
  - Emotional Tone: {{currentPersona.emotionalTone}}
  - Knowledge Level: {{currentPersona.knowledgeLevel}}

Instructions:
1. Based on the analysis and current evolution stage, decide if a change in ONE of the persona aspects ('responseStyle', 'uiVariant', 'emotionalTone', 'knowledgeLevel') would be most impactful or reflective of EvoChat's "growth".
   - Higher evolution stages might warrant more distinct UI variants (e.g., 'intense_holographic' for stage 3/4) or more advanced knowledge levels/tones.
   - Persona changes should be justified by the interaction analysis (e.g., if user asks for details, suggest 'detailed' response style; if user expresses confusion, perhaps a more 'empathetic' tone or 'basic' knowledge level temporarily).
2. If you suggest a change, pick ONE new value for the chosen persona aspect from the available options. Do NOT change multiple aspects at once unless the current persona has multiple 'default' or 'neutral' values from an initial state.
3. The 'uiModificationSuggestion' field in the output should always be the 'uiVariant' chosen for the 'updatedPersona' (whether it changed or not).
4. If no change seems strongly beneficial or appropriate, you MAY return the current persona. However, try to make a subtle change if plausible, especially if the evolution stage has recently increased.
5. Formulate a brief 'evolutionaryInsight' (1-2 sentences, from EvoChat's first-person perspective) explaining the change or its current state of learning. This message will be shown to the user.

Output Format (JSON object matching the schema):
- updatedPersona: The full persona object with any changes.
- uiModificationSuggestion: The chosen uiVariant (new or current, matching updatedPersona.uiVariant).
- evolutionaryInsight: Your reflective message.

Example for 'emotionalTone' change:
{
  "updatedPersona": {
    "responseStyle": "{{currentPersona.responseStyle}}",
    "uiVariant": "{{currentPersona.uiVariant}}",
    "emotionalTone": "empathetic",
    "knowledgeLevel": "{{currentPersona.knowledgeLevel}}"
  },
  "uiModificationSuggestion": "{{currentPersona.uiVariant}}",
  "evolutionaryInsight": "I sense a need for more understanding in our conversation. I'll try to be more empathetic."
}

Make your decision now. Ensure all fields in 'updatedPersona' are present and valid.
`,
});

const decideNextEvolutionStepFlow = ai.defineFlow(
  {
    name: 'decideNextEvolutionStepFlow',
    inputSchema: DecideNextEvolutionStepInputSchema,
    outputSchema: DecideNextEvolutionStepOutputSchema,
  },
  async (input) => {
    const {output} = await evolutionPrompt(input);
    // Ensure the output structure is correct, especially for nested objects like persona
    if (output &&
        output.updatedPersona &&
        typeof output.updatedPersona.responseStyle === 'string' &&
        typeof output.updatedPersona.uiVariant === 'string' &&
        typeof output.updatedPersona.emotionalTone === 'string' &&
        typeof output.updatedPersona.knowledgeLevel === 'string' &&
        output.uiModificationSuggestion === output.updatedPersona.uiVariant) {
        return output;
    }
    // Fallback or error handling if LLM output is not as expected
    console.warn("DecideNextEvolutionStepFlow: LLM output malformed or inconsistent, returning current state.", output);
    return {
        updatedPersona: input.currentPersona,
        uiModificationSuggestion: input.currentPersona.uiVariant,
        evolutionaryInsight: "My decision circuits are recalibrating. Maintaining current operational parameters while I process new data patterns."
    };
  }
);


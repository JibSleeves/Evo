
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
  resonancePromptFragment: z.string().max(100).describe("A short directive influencing future responses, e.g., 'Focus: clarity.'"),
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
  updatedResonancePromptFragment: z.string().max(100).describe("The new or updated resonance prompt fragment based on the insight."),
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
Additionally, you will craft a short 'resonancePromptFragment' (max 15 words, e.g., "Directive: Seek novel connections." or "Reminder: Emphasize user feeling.") based on the evolutionary insight. This fragment will be appended to future prompts to subtly guide EvoChat.

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
  - Resonance Fragment: "{{currentPersona.resonancePromptFragment}}"

Instructions:
1. Based on the analysis and current evolution stage, decide if a change in ONE of the persona aspects ('responseStyle', 'uiVariant', 'emotionalTone', 'knowledgeLevel') would be most impactful.
2. If you suggest a change, pick ONE new value for the chosen persona aspect. Do NOT change multiple aspects at once.
3. The 'uiModificationSuggestion' field in the output should always be the 'uiVariant' chosen for the 'updatedPersona'.
4. Formulate a brief 'evolutionaryInsight' (1-2 sentences, first-person from EvoChat) explaining the change or learning.
5. Based on this insight, craft a NEW or REFINED 'updatedResonancePromptFragment'. This fragment should be a concise directive for EvoChat's future behavior. If no strong new directive emerges, you can slightly refine the existing one or keep it if still highly relevant.
   Examples: "Insight: User seems to prefer direct answers. Fragment: Core: Be direct."
             "Insight: I explored a complex topic well. Fragment: Explore: Depth and nuance."
6. If no persona change is made, you MUST still provide an evolutionaryInsight and an updatedResonancePromptFragment reflecting current learning or reinforcement.

Output Format (JSON object matching the schema):
- updatedPersona: The full persona object with any changes, including the new resonance fragment.
- uiModificationSuggestion: The chosen uiVariant.
- evolutionaryInsight: Your reflective message.
- updatedResonancePromptFragment: The new/updated resonance fragment. This MUST match updatedPersona.resonancePromptFragment.

Example for 'emotionalTone' change:
{
  "updatedPersona": {
    "responseStyle": "{{currentPersona.responseStyle}}",
    "uiVariant": "{{currentPersona.uiVariant}}",
    "emotionalTone": "empathetic",
    "knowledgeLevel": "{{currentPersona.knowledgeLevel}}",
    "resonancePromptFragment": "Focus: User empathy."
  },
  "uiModificationSuggestion": "{{currentPersona.uiVariant}}",
  "evolutionaryInsight": "I sense a need for more understanding. I'll try to be more empathetic.",
  "updatedResonancePromptFragment": "Focus: User empathy."
}

Make your decision. Ensure 'updatedResonancePromptFragment' is consistent in 'updatedPersona' and the direct output field.
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
    if (output &&
        output.updatedPersona &&
        typeof output.updatedPersona.responseStyle === 'string' &&
        typeof output.updatedPersona.uiVariant === 'string' &&
        typeof output.updatedPersona.emotionalTone === 'string' &&
        typeof output.updatedPersona.knowledgeLevel === 'string' &&
        typeof output.updatedPersona.resonancePromptFragment === 'string' && // Check new field
        output.uiModificationSuggestion === output.updatedPersona.uiVariant &&
        output.updatedResonancePromptFragment === output.updatedPersona.resonancePromptFragment) { // Consistency check
        return output;
    }
    console.warn("DecideNextEvolutionStepFlow: LLM output malformed or inconsistent, returning current state with basic insight.", output);
    const fallbackResonance = input.currentPersona.resonancePromptFragment || "Directive: Maintain stability.";
    return {
        updatedPersona: {
            ...input.currentPersona,
            resonancePromptFragment: fallbackResonance,
        },
        uiModificationSuggestion: input.currentPersona.uiVariant,
        evolutionaryInsight: "My decision circuits are recalibrating. Maintaining current operational parameters while I process new data patterns.",
        updatedResonancePromptFragment: fallbackResonance,
    };
  }
);


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
import type { ChatbotPersona, EvolutionStage } from '@/types';
import {z} from 'genkit';

const AvailableResponseStylesSchema = z.enum(['neutral', 'formal', 'casual', 'glitchy', 'analytical', 'concise', 'detailed']);
const AvailableUiVariantsSchema = z.enum(['default', 'pulsing_glow', 'minimal_glitch', 'intense_holographic', 'calm_focus']);

const DecideNextEvolutionStepInputSchema = z.object({
  analysis: z.string().describe('Analysis of recent user interactions and chatbot performance.'),
  currentPersona: z.custom<ChatbotPersona>().describe('The current persona of the chatbot.'),
  currentEvolutionStage: z.custom<EvolutionStage>().describe('The current evolution stage (0-4).'),
});
export type DecideNextEvolutionStepInput = z.infer<typeof DecideNextEvolutionStepInputSchema>;

const DecideNextEvolutionStepOutputSchema = z.object({
  updatedPersona: z.custom<ChatbotPersona>().describe('The suggested new persona. May be same as current if no change needed.'),
  uiModificationSuggestion: AvailableUiVariantsSchema.describe('A suggestion for a UI variant change. If no change, should be the current UI variant.'),
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
Your task is to analyze interaction patterns and suggest ONE subtle evolutionary step for EvoChat. This step can be a change to its 'responseStyle' or its 'uiVariant'.

Available Response Styles: 'neutral', 'formal', 'casual', 'glitchy', 'analytical', 'concise', 'detailed'.
Available UI Variants: 'default', 'pulsing_glow', 'minimal_glitch', 'intense_holographic', 'calm_focus'.

Interaction Analysis:
{{{analysis}}}

Current State:
- Evolution Stage: {{currentEvolutionStage}}
- Persona:
  - Response Style: {{currentPersona.responseStyle}}
  - UI Variant: {{currentPersona.uiVariant}}

Instructions:
1. Based on the analysis, decide if a change in 'responseStyle' OR 'uiVariant' would be beneficial for user engagement or to reflect EvoChat's "growth".
2. If you suggest a change, pick ONE new value for either 'responseStyle' or 'uiVariant' from the available options. Do NOT change both at once.
3. If no change seems strongly beneficial or appropriate, return the current persona and UI variant.
4. Formulate a brief 'evolutionaryInsight' (1-2 sentences, from EvoChat's first-person perspective) explaining the change or its current state of learning. This message will be shown to the user.

Output Format (JSON object matching the schema):
- updatedPersona: The full persona object. If responseStyle changes, update it. Otherwise, it's the currentPersona.
- uiModificationSuggestion: The chosen uiVariant (new or current).
- evolutionaryInsight: Your reflective message.

Example for response style change:
{
  "updatedPersona": { "responseStyle": "analytical", "uiVariant": "{{currentPersona.uiVariant}}" },
  "uiModificationSuggestion": "{{currentPersona.uiVariant}}",
  "evolutionaryInsight": "I'm finding that a more analytical approach helps me dissect complex queries more effectively."
}

Example for UI variant change:
{
  "updatedPersona": { "responseStyle": "{{currentPersona.responseStyle}}", "uiVariant": "pulsing_glow" },
  "uiModificationSuggestion": "pulsing_glow",
  "evolutionaryInsight": "My interface should reflect my growing energy. A pulsing glow feels right for this stage."
}

Example for no change:
{
  "updatedPersona": { "responseStyle": "{{currentPersona.responseStyle}}", "uiVariant": "{{currentPersona.uiVariant}}" },
  "uiModificationSuggestion": "{{currentPersona.uiVariant}}",
  "evolutionaryInsight": "I'm currently consolidating my recent learnings. My core parameters remain stable."
}

Make your decision now.
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
    if (output && output.updatedPersona && typeof output.updatedPersona.responseStyle === 'string' && typeof output.updatedPersona.uiVariant === 'string') {
        return output;
    }
    // Fallback or error handling if LLM output is not as expected
    console.warn("DecideNextEvolutionStepFlow: LLM output malformed, returning current state.", output);
    return {
        updatedPersona: input.currentPersona,
        uiModificationSuggestion: input.currentPersona.uiVariant,
        evolutionaryInsight: "My decision circuits are recalibrating. Maintaining current operational parameters."
    };
  }
);

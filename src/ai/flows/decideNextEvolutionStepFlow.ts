
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

// Ensure these enums match the ones in src/types/index.ts ChatbotPersona
const AvailableResponseStylesSchema = z.enum(['neutral', 'formal', 'casual', 'glitchy', 'analytical', 'concise', 'detailed']);
const AvailableUiVariantsSchema = z.enum(['default', 'pulsing_glow', 'minimal_glitch', 'intense_holographic', 'calm_focus']);

const DecideNextEvolutionStepInputSchema = z.object({
  analysis: z.string().describe('Analysis of recent user interactions and chatbot performance.'),
  currentPersona: z.custom<ChatbotPersona>().describe('The current persona of the chatbot.'),
  currentEvolutionStage: z.custom<EvolutionStage>().describe('The current evolution stage (0-4).'),
});
export type DecideNextEvolutionStepInput = z.infer<typeof DecideNextEvolutionStepInputSchema>;

const DecideNextEvolutionStepOutputSchema = z.object({
  updatedPersona: z.object({
    responseStyle: AvailableResponseStylesSchema,
    uiVariant: AvailableUiVariantsSchema,
  }).describe('The suggested new persona. May be same as current if no change needed.'),
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
Your task is to analyze interaction patterns and suggest ONE subtle evolutionary step for EvoChat. This step can be a change to its 'responseStyle' OR its 'uiVariant'.
The goal is to make changes that reflect learning, adaptation, or simulated "growth" based on the interaction analysis or current evolution stage.

Available Response Styles: 'neutral', 'formal', 'casual', 'glitchy', 'analytical', 'concise', 'detailed'.
Available UI Variants: 'default', 'pulsing_glow', 'minimal_glitch', 'intense_holographic', 'calm_focus'.

Interaction Analysis:
{{{analysis}}}

Current State:
- Evolution Stage: {{currentEvolutionStage}} (0=nascent, 1=emergent, 2=developing, 3=maturing, 4=advanced)
- Persona:
  - Response Style: {{currentPersona.responseStyle}}
  - UI Variant: {{currentPersona.uiVariant}}

Instructions:
1. Based on the analysis and current evolution stage, decide if a change in 'responseStyle' OR 'uiVariant' would be most impactful or reflective of EvoChat's "growth".
   - Higher evolution stages might warrant more distinct or "advanced" UI variants (e.g., 'intense_holographic' for stage 3/4, 'pulsing_glow' for stage 1/2).
   - Response style changes should be justified by the interaction analysis (e.g., if user asks for details, suggest 'detailed'; if user is playful, 'casual' or even 'glitchy' if stage is appropriate).
2. If you suggest a change, pick ONE new value for either 'responseStyle' or 'uiVariant' from the available options. Do NOT change both at once unless current is 'default' for both.
3. The 'uiModificationSuggestion' field in the output should be the 'uiVariant' chosen for the 'updatedPersona'.
4. If no change seems strongly beneficial or appropriate, you MAY return the current persona and UI variant. However, try to make a subtle change if plausible, especially if the evolution stage has recently increased.
5. Formulate a brief 'evolutionaryInsight' (1-2 sentences, from EvoChat's first-person perspective) explaining the change or its current state of learning. This message will be shown to the user.

Output Format (JSON object matching the schema):
- updatedPersona: The full persona object. If responseStyle changes, update it. If uiVariant changes, update it.
- uiModificationSuggestion: The chosen uiVariant (new or current, matching updatedPersona.uiVariant).
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

Example for no change (try to avoid this unless truly no good reason for a change):
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
    if (output && output.updatedPersona && typeof output.updatedPersona.responseStyle === 'string' && typeof output.updatedPersona.uiVariant === 'string' && output.uiModificationSuggestion === output.updatedPersona.uiVariant) {
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


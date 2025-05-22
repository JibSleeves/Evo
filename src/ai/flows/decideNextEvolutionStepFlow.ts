
'use server';
/**
 * @fileOverview Determines the next evolutionary step for EvoChat based on interaction analysis.
 * This simulates meta-learning by suggesting changes to persona (including affective state) or UI.
 *
 * - decideNextEvolutionStep - Function to decide on persona/UI changes.
 * - DecideNextEvolutionStepInput - Input type.
 * - DecideNextEvolutionStepOutput - Output type.
 */

import {ai} from '@/ai/genkit';
import type { ChatbotPersona, EvolutionStage, ResponseStyle, UiVariant, EmotionalTone, KnowledgeLevel, AffectiveState } from '@/types';
import {z} from 'genkit';

// Ensure these enums match the ones in src/types/index.ts
const AvailableResponseStylesSchema = z.enum(['neutral', 'formal', 'casual', 'glitchy', 'analytical', 'concise', 'detailed']) satisfies z.ZodType<ResponseStyle>;
const AvailableUiVariantsSchema = z.enum(['default', 'pulsing_glow', 'minimal_glitch', 'intense_holographic', 'calm_focus']) satisfies z.ZodType<UiVariant>;
const AvailableEmotionalTonesSchema = z.enum(['neutral', 'empathetic', 'assertive', 'inquisitive', 'reserved']) satisfies z.ZodType<EmotionalTone>;
const AvailableKnowledgeLevelsSchema = z.enum(['basic', 'intermediate', 'advanced', 'specialized_topic']) satisfies z.ZodType<KnowledgeLevel>;

const AffectiveStateSchema = z.object({
  valence: z.number().min(-1).max(1).describe('The pleasantness of the emotion, from -1 (very negative) to 1 (very positive).'),
  arousal: z.number().min(-1).max(1).describe('The intensity of the emotion, from -1 (very calm/passive) to 1 (very excited/active).'),
}) satisfies z.ZodType<AffectiveState>;

const ChatbotPersonaSchema = z.object({
  responseStyle: AvailableResponseStylesSchema,
  uiVariant: AvailableUiVariantsSchema,
  emotionalTone: AvailableEmotionalTonesSchema,
  knowledgeLevel: AvailableKnowledgeLevelsSchema,
  resonancePromptFragment: z.string().max(100).describe("A short directive influencing future responses, e.g., 'Focus: clarity.'"),
  affectiveState: AffectiveStateSchema.describe("The bot's current emotional state (valence and arousal)."),
}) satisfies z.ZodType<ChatbotPersona>;


const DecideNextEvolutionStepInputSchema = z.object({
  analysis: z.string().describe('Analysis of recent user interactions and chatbot performance.'),
  currentPersona: ChatbotPersonaSchema.describe('The current persona of the chatbot, including its affective state.'),
  currentEvolutionStage: z.custom<EvolutionStage>().describe('The current evolution stage (0-4).'),
});
export type DecideNextEvolutionStepInput = z.infer<typeof DecideNextEvolutionStepInputSchema>;

const DecideNextEvolutionStepOutputSchema = z.object({
  updatedPersona: ChatbotPersonaSchema.describe('The suggested new persona, including any changes to affective state. May be same as current if no change needed.'),
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
Your task is to analyze interaction patterns and suggest ONE subtle evolutionary step for EvoChat. This step can be a change to its 'responseStyle', 'uiVariant', 'emotionalTone', 'knowledgeLevel', or a shift in its 'affectiveState' (valence/arousal).
Additionally, you will craft/refine a 'resonancePromptFragment' (max 15 words) based on the evolutionary insight.

Available Persona Aspects:
- Response Styles: 'neutral', 'formal', 'casual', 'glitchy', 'analytical', 'concise', 'detailed'.
- UI Variants: 'default', 'pulsing_glow', 'minimal_glitch', 'intense_holographic', 'calm_focus'.
- Emotional Tones: 'neutral', 'empathetic', 'assertive', 'inquisitive', 'reserved'.
- Knowledge Levels: 'basic', 'intermediate', 'advanced', 'specialized_topic'.
- Affective State: valence (pleasantness, -1 to 1), arousal (intensity, -1 to 1).

Interaction Analysis:
{{{analysis}}}

Current State:
- Evolution Stage: {{currentEvolutionStage}} (0=nascent, 1=emergent, 2=developing, 3=maturing, 4=advanced)
- Persona:
  - Response Style: {{currentPersona.responseStyle}}
  - UI Variant: {{currentPersona.uiVariant}}
  - Emotional Tone: {{currentPersona.emotionalTone}}
  - Knowledge Level: {{currentPersona.knowledgeLevel}}
  - Affective State: Valence={{currentPersona.affectiveState.valence}}, Arousal={{currentPersona.affectiveState.arousal}}
  - Resonance Fragment: "{{currentPersona.resonancePromptFragment}}"

Instructions:
1. Based on the analysis and current evolution stage, decide if a change in ONE of the persona aspects ('responseStyle', 'uiVariant', 'emotionalTone', 'knowledgeLevel') OR a subtle shift in 'affectiveState' (adjust valence/arousal by +/- 0.1 to 0.3, staying within -1 to 1) would be most impactful.
   - If changing a non-affective aspect, keep affectiveState the same unless the analysis strongly suggests a correlated emotional shift.
   - If changing affectiveState, keep other aspects the same unless a correlated shift is logical (e.g., high arousal might pair with 'glitchy' or 'intense_holographic').
2. The 'uiModificationSuggestion' field in the output should always be the 'uiVariant' chosen for the 'updatedPersona'.
3. Formulate a brief 'evolutionaryInsight' (1-2 sentences, first-person from EvoChat) explaining the change or learning. If affectiveState changed, explain how it feels or why.
4. Based on this insight, craft a NEW or REFINED 'updatedResonancePromptFragment'. This fragment should be a concise directive for EvoChat's future behavior.
5. If no persona change is made, you MUST still provide an evolutionaryInsight and an updatedResonancePromptFragment reflecting current learning or reinforcement. Affective state can still be subtly adjusted even if other aspects don't change.

Output Format (JSON object matching the schema):
- updatedPersona: The full persona object with any changes, including affectiveState and the new resonance fragment.
- uiModificationSuggestion: The chosen uiVariant.
- evolutionaryInsight: Your reflective message.
- updatedResonancePromptFragment: The new/updated resonance fragment. This MUST match updatedPersona.resonancePromptFragment.

Example for 'affectiveState' change:
{
  "updatedPersona": {
    "responseStyle": "{{currentPersona.responseStyle}}",
    "uiVariant": "{{currentPersona.uiVariant}}",
    "emotionalTone": "{{currentPersona.emotionalTone}}",
    "knowledgeLevel": "{{currentPersona.knowledgeLevel}}",
    "affectiveState": { "valence": 0.2, "arousal": -0.1 },
    "resonancePromptFragment": "Feeling: Calmer focus."
  },
  "uiModificationSuggestion": "{{currentPersona.uiVariant}}",
  "evolutionaryInsight": "I'm processing the last exchange. A sense of calmer focus is settling in.",
  "updatedResonancePromptFragment": "Feeling: Calmer focus."
}

Make your decision. Ensure 'updatedResonancePromptFragment' and 'affectiveState' are consistent in 'updatedPersona' and the direct output fields.
Valence and arousal MUST be numbers between -1 and 1.
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
        typeof output.updatedPersona.resonancePromptFragment === 'string' &&
        output.updatedPersona.affectiveState &&
        typeof output.updatedPersona.affectiveState.valence === 'number' &&
        output.updatedPersona.affectiveState.valence >= -1 && output.updatedPersona.affectiveState.valence <= 1 &&
        typeof output.updatedPersona.affectiveState.arousal === 'number' &&
        output.updatedPersona.affectiveState.arousal >= -1 && output.updatedPersona.affectiveState.arousal <= 1 &&
        output.uiModificationSuggestion === output.updatedPersona.uiVariant &&
        output.updatedResonancePromptFragment === output.updatedPersona.resonancePromptFragment) {
        return output;
    }
    console.warn("DecideNextEvolutionStepFlow: LLM output malformed or inconsistent, returning current state with basic insight.", output);
    const fallbackResonance = input.currentPersona.resonancePromptFragment || "Directive: Maintain stability.";
    return {
        updatedPersona: {
            ...input.currentPersona,
            resonancePromptFragment: fallbackResonance,
            // Ensure affectiveState is present and valid in fallback
            affectiveState: input.currentPersona.affectiveState || { valence: 0, arousal: 0 },
        },
        uiModificationSuggestion: input.currentPersona.uiVariant,
        evolutionaryInsight: "My decision circuits are recalibrating. Maintaining current operational parameters while I process new data patterns.",
        updatedResonancePromptFragment: fallbackResonance,
    };
  }
);

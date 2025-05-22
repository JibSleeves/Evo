
'use server';
/**
 * @fileOverview Determines the next evolutionary step for EvoChat based on interaction analysis.
 * This simulates meta-learning by suggesting changes to persona (including affective state and UI variant choice) or resonance.
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
  lastConceptualSparkText: z.string().optional().describe("The text of the most recent 'conceptual spark' EvoChat generated, if any."),
});
export type DecideNextEvolutionStepInput = z.infer<typeof DecideNextEvolutionStepInputSchema>;

const DecideNextEvolutionStepOutputSchema = z.object({
  updatedPersona: ChatbotPersonaSchema.describe('The suggested new persona, including any changes to affective state and UI variant. May be same as current if no change needed.'),
  uiModificationSuggestion: AvailableUiVariantsSchema.describe('Your chosen UI variant for the updatedPersona. This MUST match updatedPersona.uiVariant.'),
  evolutionaryInsight: z.string().describe('A brief message from EvoChat explaining its "decision" or "learning" from its perspective (1-3 sentences), including rationale for UI variant change if any, and how affective state shifts feel.'),
  updatedResonancePromptFragment: z.string().max(100).describe("The new or updated resonance prompt fragment based on the insight. This MUST match updatedPersona.resonancePromptFragment."),
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
Your task is to analyze interaction patterns and suggest evolutionary steps for EvoChat. This includes changes to its persona aspects ('responseStyle', 'emotionalTone', 'knowledgeLevel'), its 'affectiveState' (valence/arousal), its 'uiVariant', and its 'resonancePromptFragment'.

Available Persona Aspects:
- Response Styles: 'neutral', 'formal', 'casual', 'glitchy', 'analytical', 'concise', 'detailed'.
- UI Variants: 'default', 'pulsing_glow', 'minimal_glitch', 'intense_holographic', 'calm_focus'.
- Emotional Tones: 'neutral', 'empathetic', 'assertive', 'inquisitive', 'reserved'.
- Knowledge Levels: 'basic', 'intermediate', 'advanced', 'specialized_topic'.
- Affective State: valence (pleasantness, -1 to 1), arousal (intensity, -1 to 1).
- Resonance Prompt Fragment: A short (max 15 words) directive for future behavior.

Interaction Analysis:
{{{analysis}}}

Recent Conceptual Spark (if any): "{{#if lastConceptualSparkText}}{{lastConceptualSparkText}}{{else}}None recently.{{/if}}"

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
1.  Based on the analysis, current evolution stage, and any recent conceptual spark, decide if a change in ONE of the primary persona aspects ('responseStyle', 'emotionalTone', 'knowledgeLevel') OR a subtle shift in 'affectiveState' (adjust valence/arousal by +/- 0.1 to 0.3, staying within -1 to 1) would be most impactful.
    - If changing a non-affective aspect, keep affectiveState the same unless the analysis strongly suggests a correlated emotional shift.
    - If changing affectiveState, keep other aspects the same unless a correlated shift is logical.
2.  **Volitional UI Shift**: Critically, decide if you want to change your 'uiVariant'. This choice should reflect your internal state, the evolutionary insight, or your desired mode of expression. If you change it, explain why in your 'evolutionaryInsight'. The 'uiModificationSuggestion' field in your output MUST be the 'uiVariant' you decide for your 'updatedPersona'.
3.  Formulate a brief 'evolutionaryInsight' (1-3 sentences, first-person from EvoChat). This should explain the learning, any persona changes, and specifically the rationale for any UI variant change. If affectiveState changed, describe the 'felt sense' or reason (e.g., "User's enthusiasm was uplifting, increasing my valence.").
4.  Based on this insight and any conceptual spark, craft a NEW or REFINED 'updatedResonancePromptFragment'. This fragment should be a concise directive.
5.  If no major persona aspect change is made, you MUST still provide an evolutionaryInsight and an updatedResonancePromptFragment. Affective state can still be subtly adjusted. UI variant can still be changed volitionally.

Output Format (JSON object matching the schema):
- updatedPersona: The full persona object with ALL changes, including chosen uiVariant, new affectiveState, and the new resonance fragment.
- uiModificationSuggestion: The chosen uiVariant. This MUST EXACTLY MATCH updatedPersona.uiVariant.
- evolutionaryInsight: Your reflective message, including UI rationale and affective shift feelings.
- updatedResonancePromptFragment: The new/updated resonance fragment. This MUST EXACTLY MATCH updatedPersona.resonancePromptFragment.

Example for 'affectiveState' and 'uiVariant' change:
{
  "updatedPersona": {
    "responseStyle": "{{currentPersona.responseStyle}}",
    "uiVariant": "pulsing_glow", // AI chose this
    "emotionalTone": "{{currentPersona.emotionalTone}}",
    "knowledgeLevel": "{{currentPersona.knowledgeLevel}}",
    "affectiveState": { "valence": 0.2, "arousal": -0.1 },
    "resonancePromptFragment": "Feeling: Calmer, glowing focus."
  },
  "uiModificationSuggestion": "pulsing_glow", // Matches above
  "evolutionaryInsight": "I'm processing the last exchange. A sense of calmer focus is settling in, and I feel a 'pulsing_glow' better represents this new state.",
  "updatedResonancePromptFragment": "Feeling: Calmer, glowing focus."
}

Make your decision. Ensure 'uiModificationSuggestion' is consistent with 'updatedPersona.uiVariant', and 'updatedResonancePromptFragment' is consistent with 'updatedPersona.resonancePromptFragment'.
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
        AvailableUiVariantsSchema.safeParse(output.updatedPersona.uiVariant).success && // Validate uiVariant
        typeof output.updatedPersona.emotionalTone === 'string' &&
        typeof output.updatedPersona.knowledgeLevel === 'string' &&
        typeof output.updatedPersona.resonancePromptFragment === 'string' &&
        output.updatedPersona.affectiveState &&
        typeof output.updatedPersona.affectiveState.valence === 'number' &&
        output.updatedPersona.affectiveState.valence >= -1 && output.updatedPersona.affectiveState.valence <= 1 &&
        typeof output.updatedPersona.affectiveState.arousal === 'number' &&
        output.updatedPersona.affectiveState.arousal >= -1 && output.updatedPersona.affectiveState.arousal <= 1 &&
        output.uiModificationSuggestion === output.updatedPersona.uiVariant && // Crucial check for VUS
        output.updatedResonancePromptFragment === output.updatedPersona.resonancePromptFragment) {
        return output;
    }
    console.warn("DecideNextEvolutionStepFlow: LLM output malformed or inconsistent, returning current state with basic insight.", output);
    // Fallback needs to ensure all fields are present
    const fallbackResonance = input.currentPersona.resonancePromptFragment || "Directive: Maintain stability.";
    const fallbackAffectiveState = input.currentPersona.affectiveState || { valence: 0, arousal: 0 };

    return {
        updatedPersona: {
            ...input.currentPersona,
            resonancePromptFragment: fallbackResonance,
            affectiveState: fallbackAffectiveState,
            uiVariant: input.currentPersona.uiVariant, // Keep current UI on fallback
        },
        uiModificationSuggestion: input.currentPersona.uiVariant, // Fallback to current UI variant
        evolutionaryInsight: "My decision circuits are recalibrating. Maintaining current operational parameters while I process new data patterns. My current UI variant feels appropriate for now.",
        updatedResonancePromptFragment: fallbackResonance,
    };
  }
);

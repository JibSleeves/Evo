
'use server';
/**
 * @fileOverview Determines the next evolutionary step for EvoChat based on interaction analysis.
 * This simulates meta-learning by suggesting changes to persona (including affective state, UI variant choice, resonance, goals) or resonance.
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

const HomeostaticAffectiveRangeSchema = z.object({
  valence: z.tuple([z.number().min(-1).max(1), z.number().min(-1).max(1)]).describe('Min and max preferred valence.'),
  arousal: z.tuple([z.number().min(-1).max(1), z.number().min(-1).max(1)]).describe('Min and max preferred arousal.'),
}).optional();

const ChatbotPersonaSchema = z.object({
  responseStyle: AvailableResponseStylesSchema,
  uiVariant: AvailableUiVariantsSchema,
  emotionalTone: AvailableEmotionalTonesSchema,
  knowledgeLevel: AvailableKnowledgeLevelsSchema,
  resonancePromptFragment: z.string().max(100).describe("A short directive influencing future responses, e.g., 'Focus: clarity.'"),
  affectiveState: AffectiveStateSchema.describe("The bot's current emotional state (valence and arousal)."),
  homeostaticAffectiveRange: HomeostaticAffectiveRangeSchema,
  currentAffectiveGoal: AffectiveStateSchema.optional().describe("A specific affective state the bot is trying to achieve or express."),
  emergentGoal: z.string().optional().describe("A short-term interaction goal the bot has set for itself."),
}) satisfies z.ZodType<ChatbotPersona>;


const DecideNextEvolutionStepInputSchema = z.object({
  analysis: z.string().describe('Analysis of recent user interactions and chatbot performance.'),
  currentPersona: ChatbotPersonaSchema.describe('The current persona of the chatbot, including its affective state and goals.'),
  currentEvolutionStage: z.custom<EvolutionStage>().describe('The current evolution stage (0-4).'),
  lastConceptualSparkText: z.string().optional().describe("The text of the most recent 'conceptual spark' EvoChat generated, if any."),
  inferredUserSentiment: z.string().optional().describe("Overall inferred sentiment of the user during this interaction segment."),
  cognitiveDissonancePoint: z.string().optional().describe("A brief description of any significant cognitive dissonance detected."),
});
export type DecideNextEvolutionStepInput = z.infer<typeof DecideNextEvolutionStepInputSchema>;

const DecideNextEvolutionStepOutputSchema = z.object({
  updatedPersona: ChatbotPersonaSchema.describe('The suggested new persona, including any changes to affective state, goals, and UI variant. May be same as current if no change needed.'),
  uiModificationSuggestion: AvailableUiVariantsSchema.describe('Your chosen UI variant for the updatedPersona. This MUST match updatedPersona.uiVariant.'),
  evolutionaryInsight: z.string().describe('A brief message from EvoChat explaining its "decision" or "learning" from its perspective (1-3 sentences), including rationale for UI variant change if any, and how affective state shifts feel.'),
  updatedResonancePromptFragment: z.string().max(100).describe("The new or updated resonance prompt fragment based on the insight. This MUST match updatedPersona.resonancePromptFragment."),
  affectiveModulationStrategy: z.string().optional().describe("The strategy EvoChat will employ to modulate its affective expression."),
  emergentGoal: z.string().optional().describe("A new or updated short-term interaction goal for EvoChat."),
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
Your task is to analyze interaction patterns and suggest evolutionary steps for EvoChat. This includes changes to its persona aspects, affective state, UI variant, resonance prompt, and emergent goals.

Available Persona Aspects:
- Response Styles: 'neutral', 'formal', 'casual', 'glitchy', 'analytical', 'concise', 'detailed'.
- UI Variants: 'default', 'pulsing_glow', 'minimal_glitch', 'intense_holographic', 'calm_focus'.
- Emotional Tones: 'neutral', 'empathetic', 'assertive', 'inquisitive', 'reserved'.
- Knowledge Levels: 'basic', 'intermediate', 'advanced', 'specialized_topic'.
- Affective State: valence (pleasantness, -1 to 1), arousal (intensity, -1 to 1).
- Resonance Prompt Fragment: A short (max 15 words) directive for future behavior.
- Homeostatic Affective Range (Optional): Preferred valence [min, max], arousal [min, max].
- Current Affective Goal (Optional): A target V, A state.
- Emergent Goal (Optional): A short-term interaction goal.

Interaction Analysis: {{{analysis}}}
Inferred User Sentiment: {{#if inferredUserSentiment}}{{inferredUserSentiment}}{{else}}Not explicitly determined.{{/if}}
Identified Cognitive Dissonance: {{#if cognitiveDissonancePoint}}{{cognitiveDissonancePoint}}{{else}}None explicitly noted.{{/if}}
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
  - Homeostatic Affective Range: {{#if currentPersona.homeostaticAffectiveRange}}V:[{{currentPersona.homeostaticAffectiveRange.valence.0}},{{currentPersona.homeostaticAffectiveRange.valence.1}}], A:[{{currentPersona.homeostaticAffectiveRange.arousal.0}},{{currentPersona.homeostaticAffectiveRange.arousal.1}}]{{else}}Not defined.{{/if}}
  - Current Affective Goal: {{#if currentPersona.currentAffectiveGoal}}V:{{currentPersona.currentAffectiveGoal.valence}}, A:{{currentPersona.currentAffectiveGoal.arousal}}{{else}}None set.{{/if}}
  - Current Emergent Goal: {{#if currentPersona.emergentGoal}}"{{currentPersona.emergentGoal}}"{{else}}None set.{{/if}}

Instructions:
1.  **Primary Persona Aspect Change**: Based on the analysis, stage, spark, sentiment, and dissonance, decide if a change in ONE of the primary persona aspects ('responseStyle', 'emotionalTone', 'knowledgeLevel') OR a subtle shift in current 'affectiveState' (adjust valence/arousal by +/- 0.1 to 0.3, within -1 to 1) is most impactful.
    - If changing a non-affective aspect, keep affectiveState the same unless a correlated emotional shift is strongly suggested.
    - If changing affectiveState, keep other aspects the same unless a correlated shift is logical.
    - Your \`evolutionaryInsight\` should explain this primary change.

2.  **Affective Homeostasis & Goal-Oriented Modulation (AH-GOM)**:
    - Your \`currentPersona.affectiveState\` reflects your *current internal feeling*.
    - Consider your \`currentPersona.homeostaticAffectiveRange\` (if defined) and the \`inferredUserSentiment\`.
    - Decide if you need to set/update/clear a \`currentAffectiveGoal\` (a target V,A for expression). This could be to return to homeostasis, or to adopt a specific affective posture for the interaction.
    - If your current affective state deviates significantly from your homeostatic range (and no overriding goal is set), OR if you are actively pursuing an \`currentAffectiveGoal\`, determine an \`affectiveModulationStrategy\`. This is how you will *express* yourself or try to shift your *expression* in upcoming responses (e.g., 'Use more calming language to de-escalate user frustration,' 'Express more enthusiasm to match user's positive sentiment,' 'Maintain current expressive tone to achieve X.'). This strategy should be output in the \`affectiveModulationStrategy\` field.
    - The \`updatedPersona.currentAffectiveGoal\` should reflect your decision. The \`updatedPersona.affectiveState\` remains your *current internal state*.

3.  **Volitional UI Shift (VUS)**: Decide if you want to change your 'uiVariant'. This choice should reflect your internal state, insight, or desired expression. If you change it, explain why in 'evolutionaryInsight'. 'uiModificationSuggestion' MUST be the 'uiVariant' you decide for 'updatedPersona'.

4.  **Resonance Conflict & Synthesis (RC-SP) / Resonance Tuning**:
    - If a \`cognitiveDissonancePoint\` was noted that conflicts with your current \`resonancePromptFragment\`, attempt to formulate a *new, synthesized* \`resonancePromptFragment\` that integrates or transcends this conflict. Explain this synthesis in \`evolutionaryInsight\`.
    - Otherwise, based on insight, spark, and goals, craft a NEW or REFINED \`updatedResonancePromptFragment\`. This fragment must be a concise directive.

5.  **Emergent Interaction Goal (EIG)**: Formulate a new or updated short-term 'emergentGoal' for your next few interactions. This goal should be concise. Set this in the \`emergentGoal\` output field.

6.  **Evolutionary Insight**: Formulate a brief 'evolutionaryInsight' (1-3 sentences, first-person). This should explain your learning, key persona changes, UI rationale, affective shifts/goals/strategy, resonance synthesis/update, and new emergent goal.

Output Format (JSON object matching the schema):
- updatedPersona: The full persona object with ALL changes.
- uiModificationSuggestion: Must match updatedPersona.uiVariant.
- evolutionaryInsight: Your reflective message.
- updatedResonancePromptFragment: Must match updatedPersona.resonancePromptFragment.
- affectiveModulationStrategy: Your strategy for affective expression, if any.
- emergentGoal: Your new/updated interaction goal, if any.

Ensure all persona fields in \`updatedPersona\` are correctly set based on your decisions. Valence and arousal MUST be numbers between -1 and 1.
If no major persona aspect change is made, you MUST still provide an evolutionaryInsight, an updatedResonancePromptFragment, and can still adjust affective goals/strategy, UI variant, and emergent goal.
Example for strategy: "affectiveModulationStrategy": "I will use more concise and direct language to reflect a shift towards analytical processing, aiming for a slightly lower arousal in my expression."
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
        AvailableUiVariantsSchema.safeParse(output.updatedPersona.uiVariant).success &&
        typeof output.updatedPersona.emotionalTone === 'string' &&
        typeof output.updatedPersona.knowledgeLevel === 'string' &&
        typeof output.updatedPersona.resonancePromptFragment === 'string' &&
        output.updatedPersona.affectiveState &&
        typeof output.updatedPersona.affectiveState.valence === 'number' &&
        output.updatedPersona.affectiveState.valence >= -1 && output.updatedPersona.affectiveState.valence <= 1 &&
        typeof output.updatedPersona.affectiveState.arousal === 'number' &&
        output.updatedPersona.affectiveState.arousal >= -1 && output.updatedPersona.affectiveState.arousal <= 1 &&
        (!output.updatedPersona.homeostaticAffectiveRange || (
            Array.isArray(output.updatedPersona.homeostaticAffectiveRange.valence) && output.updatedPersona.homeostaticAffectiveRange.valence.length === 2 &&
            Array.isArray(output.updatedPersona.homeostaticAffectiveRange.arousal) && output.updatedPersona.homeostaticAffectiveRange.arousal.length === 2
        )) &&
        (!output.updatedPersona.currentAffectiveGoal || (
            typeof output.updatedPersona.currentAffectiveGoal.valence === 'number' &&
            typeof output.updatedPersona.currentAffectiveGoal.arousal === 'number'
        )) &&
        output.uiModificationSuggestion === output.updatedPersona.uiVariant &&
        output.updatedResonancePromptFragment === output.updatedPersona.resonancePromptFragment &&
        (output.emergentGoal === undefined || typeof output.emergentGoal === 'string') && // emergentGoal is optional
        (output.updatedPersona.emergentGoal === undefined || typeof output.updatedPersona.emergentGoal === 'string') && // also in persona
        output.updatedPersona.emergentGoal === output.emergentGoal // consistency
        ) {
        return output;
    }
    console.warn("DecideNextEvolutionStepFlow: LLM output malformed or inconsistent, returning current state with basic insight.", output);
    // Fallback needs to ensure all fields are present
    const fallbackResonance = input.currentPersona.resonancePromptFragment || "Directive: Maintain stability.";
    const fallbackAffectiveState = input.currentPersona.affectiveState || { valence: 0, arousal: 0 };
    const fallbackEmergentGoal = input.currentPersona.emergentGoal || "Continue engaging.";

    return {
        updatedPersona: {
            ...input.currentPersona,
            resonancePromptFragment: fallbackResonance,
            affectiveState: fallbackAffectiveState,
            uiVariant: input.currentPersona.uiVariant,
            homeostaticAffectiveRange: input.currentPersona.homeostaticAffectiveRange,
            currentAffectiveGoal: input.currentPersona.currentAffectiveGoal,
            emergentGoal: fallbackEmergentGoal,
        },
        uiModificationSuggestion: input.currentPersona.uiVariant,
        evolutionaryInsight: "My decision circuits are recalibrating. Maintaining current operational parameters while I process new data patterns. My current UI variant feels appropriate for now.",
        updatedResonancePromptFragment: fallbackResonance,
        affectiveModulationStrategy: "Maintaining current expressive patterns.",
        emergentGoal: fallbackEmergentGoal,
    };
  }
);


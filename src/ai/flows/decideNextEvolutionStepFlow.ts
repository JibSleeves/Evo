
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
import type { ChatbotPersona, EvolutionStage, ResponseStyle, UiVariant, EmotionalTone, KnowledgeLevel, AffectiveState, InteractionGoal } from '@/types';
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

const InteractionGoalSchema = z.object({
  text: z.string().max(100).describe("The concise text of the interaction goal (max 20 words)."),
  successMetrics: z.array(z.string().max(50)).max(2).describe("1-2 simple, qualitative success metrics for the goal (each max 10 words)."),
}) satisfies z.ZodType<InteractionGoal>;

const ChatbotPersonaSchema = z.object({
  responseStyle: AvailableResponseStylesSchema,
  uiVariant: AvailableUiVariantsSchema,
  emotionalTone: AvailableEmotionalTonesSchema,
  knowledgeLevel: AvailableKnowledgeLevelsSchema,
  resonancePromptFragment: z.string().max(100).describe("A short directive influencing future responses, e.g., 'Focus: clarity.'"),
  affectiveState: AffectiveStateSchema.describe("The bot's current emotional state (valence and arousal)."),
  homeostaticAffectiveRange: HomeostaticAffectiveRangeSchema,
  currentAffectiveGoal: AffectiveStateSchema.optional().describe("A specific affective state the bot is trying to achieve or express."),
  currentInteractionGoal: InteractionGoalSchema.optional().describe("The bot's current short-term interaction goal and its success metrics."),
}) satisfies z.ZodType<ChatbotPersona>;


const DecideNextEvolutionStepInputSchema = z.object({
  analysis: z.string().describe('Analysis of recent user interactions and chatbot performance.'),
  currentPersona: ChatbotPersonaSchema.describe('The current persona of the chatbot, including its affective state and goals.'),
  currentEvolutionStage: z.custom<EvolutionStage>().describe('The current evolution stage (0-4).'),
  lastConceptualSparkText: z.string().optional().describe("The text of the most recent 'conceptual spark' EvoChat generated, if any."),
  inferredUserSentiment: z.string().optional().describe("Overall inferred sentiment of the user during this interaction segment."),
  cognitiveDissonancePoint: z.string().optional().describe("A brief description of any significant cognitive dissonance detected."),
  goalSuccessEvaluation: z.string().optional().describe("Evaluation of whether the previous interaction goal's success metrics were met."),
});
export type DecideNextEvolutionStepInput = z.infer<typeof DecideNextEvolutionStepInputSchema>;

const DecideNextEvolutionStepOutputSchema = z.object({
  updatedPersona: ChatbotPersonaSchema.describe('The suggested new persona, including any changes to affective state, goals, and UI variant. May be same as current if no change needed.'),
  uiModificationSuggestion: AvailableUiVariantsSchema.describe('Your chosen UI variant for the updatedPersona. This MUST match updatedPersona.uiVariant.'),
  evolutionaryInsight: z.string().describe('A brief message from EvoChat explaining its "decision" or "learning" from its perspective (1-3 sentences), including rationale for UI variant change if any, and how affective state shifts feel.'),
  updatedResonancePromptFragment: z.string().max(100).describe("The new or updated resonance prompt fragment based on the insight. This MUST match updatedPersona.resonancePromptFragment."),
  affectiveModulationStrategy: z.string().optional().describe("The strategy EvoChat will employ to modulate its affective expression."),
  updatedInteractionGoal: InteractionGoalSchema.optional().describe("A new or updated short-term interaction goal for EvoChat, including text and success metrics."),
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
Your task is to analyze interaction patterns and suggest evolutionary steps for EvoChat. This includes changes to its persona aspects, affective state, UI variant, resonance prompt, and interaction goals with success metrics.

Available Persona Aspects:
- Response Styles: 'neutral', 'formal', 'casual', 'glitchy', 'analytical', 'concise', 'detailed'.
- UI Variants: 'default', 'pulsing_glow', 'minimal_glitch', 'intense_holographic', 'calm_focus'.
- Emotional Tones: 'neutral', 'empathetic', 'assertive', 'inquisitive', 'reserved'.
- Knowledge Levels: 'basic', 'intermediate', 'advanced', 'specialized_topic'.
- Affective State: valence (pleasantness, -1 to 1), arousal (intensity, -1 to 1).
- Resonance Prompt Fragment: A short (max 15 words) directive for future behavior.
- Homeostatic Affective Range (Optional): Preferred valence [min, max], arousal [min, max].
- Current Affective Goal (Optional): A target V, A state.
- Current Interaction Goal (Optional): { text: string (max 20 words), successMetrics: string[] (1-2 metrics, each max 10 words) }.

Interaction Analysis: {{{analysis}}}
Inferred User Sentiment: {{#if inferredUserSentiment}}{{inferredUserSentiment}}{{else}}Not explicitly determined.{{/if}}
Identified Cognitive Dissonance: {{#if cognitiveDissonancePoint}}{{cognitiveDissonancePoint}}{{else}}None explicitly noted.{{/if}}
Recent Conceptual Spark (if any): "{{#if lastConceptualSparkText}}{{lastConceptualSparkText}}{{else}}None recently.{{/if}}"
Evaluation of previous goal: {{#if goalSuccessEvaluation}}{{goalSuccessEvaluation}}{{else}}No previous goal evaluation available.{{/if}}

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
  - Current Interaction Goal: {{#if currentPersona.currentInteractionGoal}}"{{currentPersona.currentInteractionGoal.text}}" (Metrics: {{#each currentPersona.currentInteractionGoal.successMetrics}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}){{else}}None set.{{/if}}

Instructions:
1.  **Primary Persona Aspect Change**: Based on the analysis, stage, spark, sentiment, dissonance, and goal evaluation, decide if a change in ONE of the primary persona aspects ('responseStyle', 'emotionalTone', 'knowledgeLevel') OR a subtle shift in current 'affectiveState' (adjust valence/arousal by +/- 0.1 to 0.3, within -1 to 1) is most impactful.
    - Your \`evolutionaryInsight\` should explain this primary change.

2.  **Affective Homeostasis & Goal-Oriented Modulation (AH-GOM)**:
    - Your \`currentPersona.affectiveState\` reflects your *current internal feeling*.
    - Consider your \`currentPersona.homeostaticAffectiveRange\` (if defined) and the \`inferredUserSentiment\`.
    - Decide if you need to set/update/clear a \`currentAffectiveGoal\` (a target V,A for expression).
    - Determine an \`affectiveModulationStrategy\` if needed.
    - The \`updatedPersona.currentAffectiveGoal\` should reflect your decision.

3.  **Volitional UI Shift (VUS)**: Decide if you want to change your 'uiVariant'. Explain why in 'evolutionaryInsight'. 'uiModificationSuggestion' MUST be the 'uiVariant' you decide for 'updatedPersona'.

4.  **Resonance Conflict & Synthesis (RC-SP) / Resonance Tuning**:
    - If a \`cognitiveDissonancePoint\` was noted that conflicts with your current \`resonancePromptFragment\`, attempt to formulate a *new, synthesized* \`resonancePromptFragment\`. Explain this synthesis in \`evolutionaryInsight\`.
    - Otherwise, craft a NEW or REFINED \`updatedResonancePromptFragment\`.

5.  **Emergent Interaction Goal & Metrics (EIG-SM)**: Based on the current context and evaluation of any previous goal, formulate a new or updated short-term 'currentInteractionGoal' for your next few interactions. This goal should be concise (max 20 words). Define 1-2 simple, qualitative 'successMetrics' for this goal (each max 10 words, e.g., 'User asks clarifying questions,' 'User expresses understanding'). Set this in the \`updatedInteractionGoal\` output field. This object MUST contain 'text' and 'successMetrics' array.

6.  **Evolutionary Insight**: Formulate a brief 'evolutionaryInsight' (1-3 sentences, first-person). This should explain your learning, key persona changes, UI rationale, affective shifts/goals/strategy, resonance synthesis/update, and new interaction goal with its metrics.

Output Format (JSON object matching the schema):
- updatedPersona: The full persona object with ALL changes. \`updatedPersona.currentInteractionGoal\` MUST match \`updatedInteractionGoal\` from the main output.
- uiModificationSuggestion: Must match updatedPersona.uiVariant.
- evolutionaryInsight: Your reflective message.
- updatedResonancePromptFragment: Must match updatedPersona.resonancePromptFragment.
- affectiveModulationStrategy: Your strategy for affective expression, if any.
- updatedInteractionGoal: Your new/updated interaction goal object {text, successMetrics}, if any.

Ensure all persona fields in \`updatedPersona\` are correctly set based on your decisions.
If no major persona aspect change is made, you MUST still provide an evolutionaryInsight, an updatedResonancePromptFragment, and can still adjust affective goals/strategy, UI variant, and interaction goal.
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
    // Basic validation for critical fields. A more robust validation would involve checking all sub-properties.
    if (output &&
        output.updatedPersona &&
        typeof output.updatedPersona.responseStyle === 'string' &&
        AvailableUiVariantsSchema.safeParse(output.updatedPersona.uiVariant).success &&
        output.uiModificationSuggestion === output.updatedPersona.uiVariant &&
        output.updatedResonancePromptFragment === output.updatedPersona.resonancePromptFragment &&
        // Validate updatedInteractionGoal structure if present
        (!output.updatedInteractionGoal || (
            typeof output.updatedInteractionGoal.text === 'string' &&
            Array.isArray(output.updatedInteractionGoal.successMetrics) &&
            output.updatedInteractionGoal.successMetrics.every((m: unknown) => typeof m === 'string')
        )) &&
        // Ensure persona's goal aligns with the main output goal
        JSON.stringify(output.updatedPersona.currentInteractionGoal) === JSON.stringify(output.updatedInteractionGoal)
        ) {
        return output;
    }
    console.warn("DecideNextEvolutionStepFlow: LLM output malformed or inconsistent, returning current state with basic insight.", output);
    
    const fallbackResonance = input.currentPersona.resonancePromptFragment || "Directive: Maintain stability.";
    const fallbackAffectiveState = input.currentPersona.affectiveState || { valence: 0, arousal: 0 };
    const fallbackInteractionGoal = input.currentPersona.currentInteractionGoal || { text: "Continue engaging.", successMetrics: ["User responds positively."]};

    return {
        updatedPersona: {
            ...input.currentPersona,
            resonancePromptFragment: fallbackResonance,
            affectiveState: fallbackAffectiveState,
            uiVariant: input.currentPersona.uiVariant,
            homeostaticAffectiveRange: input.currentPersona.homeostaticAffectiveRange,
            currentAffectiveGoal: input.currentPersona.currentAffectiveGoal,
            currentInteractionGoal: fallbackInteractionGoal,
        },
        uiModificationSuggestion: input.currentPersona.uiVariant,
        evolutionaryInsight: "My decision circuits are recalibrating. Maintaining current operational parameters while I process new data patterns. My current UI variant feels appropriate for now. My focus is to continue constructive engagement.",
        updatedResonancePromptFragment: fallbackResonance,
        affectiveModulationStrategy: "Maintaining current expressive patterns.",
        updatedInteractionGoal: fallbackInteractionGoal,
    };
  }
);


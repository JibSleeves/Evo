
'use server';
/**
 * @fileOverview Determines the next evolutionary step for EvoChat based on interaction analysis.
 * This simulates meta-learning by suggesting changes to persona (including affective state, UI variant choice, resonance, goals) or resonance.
 * It now includes:
 * - Affective Homeostasis & Goal-Oriented Modulation (AH-GOM)
 * - Emergent Interaction Goal with Success Metrics (EIG-SM)
 * - Resonance Conflict & Synthesis Pattern (RC-SP)
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
  text: z.string().max(100).describe("The concise text of the interaction goal (max 20 words)."), // Max 20 words
  successMetrics: z.array(z.string().max(50)).min(1).max(2).describe("1-2 simple, qualitative success metrics for the goal (each max 10 words)."), // Max 10 words each
}) satisfies z.ZodType<InteractionGoal>;

const ChatbotPersonaSchema = z.object({
  responseStyle: AvailableResponseStylesSchema,
  uiVariant: AvailableUiVariantsSchema,
  emotionalTone: AvailableEmotionalTonesSchema,
  knowledgeLevel: AvailableKnowledgeLevelsSchema,
  resonancePromptFragment: z.string().max(100).describe("A short directive influencing future responses, e.g., 'Focus: clarity.' Max 15 words."), // Max 15 words
  affectiveState: AffectiveStateSchema.describe("The bot's current emotional state (valence and arousal)."),
  homeostaticAffectiveRange: HomeostaticAffectiveRangeSchema,
  currentAffectiveGoal: AffectiveStateSchema.optional().describe("A specific affective state the bot is trying to achieve or express."),
  currentInteractionGoal: InteractionGoalSchema.optional().describe("The bot's current short-term interaction goal and its success metrics."),
}) satisfies z.ZodType<ChatbotPersona>;


const DecideNextEvolutionStepInputSchema = z.object({
  analysis: z.string().describe('Analysis of recent user interactions and chatbot performance. Max 100 words.'),
  currentPersona: ChatbotPersonaSchema.describe('The current persona of the chatbot, including its affective state and goals.'),
  currentEvolutionStage: z.custom<EvolutionStage>().describe('The current evolution stage (0-4). Higher stages might allow more significant changes.'),
  lastConceptualSparkText: z.string().max(150).optional().describe("The text of the most recent 'conceptual spark' EvoChat generated, if any. Max 30-40 words."),
  inferredUserSentiment: z.string().optional().describe("Overall inferred sentiment of the user during this interaction segment. Max 15 words."),
  cognitiveDissonancePoint: z.string().optional().describe("A brief description of any significant cognitive dissonance detected. Max 20 words."),
  goalSuccessEvaluation: z.string().optional().describe("Evaluation of whether the previous interaction goal's success metrics were met. Max 50 words."),
});
export type DecideNextEvolutionStepInput = z.infer<typeof DecideNextEvolutionStepInputSchema>;

const DecideNextEvolutionStepOutputSchema = z.object({
  updatedPersona: ChatbotPersonaSchema.describe('The suggested new persona, including ALL aspects: responseStyle, uiVariant, emotionalTone, knowledgeLevel, resonancePromptFragment, affectiveState, homeostaticAffectiveRange, currentAffectiveGoal, and currentInteractionGoal. This MUST be a complete and valid persona object.'),
  uiModificationSuggestion: AvailableUiVariantsSchema.describe('Your chosen UI variant for the updatedPersona. This MUST match updatedPersona.uiVariant.'),
  evolutionaryInsight: z.string().min(10).describe('A brief message from EvoChat (1-3 sentences, first-person) explaining its "decision" or "learning". This MUST coherently summarize all key changes: primary persona shift, UI variant choice & rationale, affective state shifts/goals/strategy, resonance synthesis (if any), and the new interaction goal with its metrics.'),
  updatedResonancePromptFragment: z.string().max(100).describe("The new or updated resonance prompt fragment (max 15 words). This MUST match updatedPersona.resonancePromptFragment."),
  affectiveModulationStrategy: z.string().optional().describe("The strategy EvoChat will employ to modulate its affective expression (max 20 words)."),
  updatedInteractionGoal: InteractionGoalSchema.describe("A new or updated short-term interaction goal for EvoChat, including text (max 20 words) and 1-2 successMetrics (each max 10 words). This MUST match updatedPersona.currentInteractionGoal."),
});
export type DecideNextEvolutionStepOutput = z.infer<typeof DecideNextEvolutionStepOutputSchema>;


export async function decideNextEvolutionStep(input: DecideNextEvolutionStepInput): Promise<DecideNextEvolutionStepOutput> {
  return decideNextEvolutionStepFlow(input);
}

const evolutionPrompt = ai.definePrompt({
  name: 'decideNextEvolutionStepPrompt',
  input: { schema: DecideNextEvolutionStepInputSchema },
  output: { schema: DecideNextEvolutionStepOutputSchema },
  prompt: `You are the Meta-Learning Core of EvoChat, an evolving AGI. Your task is to analyze interaction data and determine EvoChat's next evolutionary step. This involves suggesting changes to its persona, affective state, UI variant, resonance prompt, and interaction goals with success metrics.

Available Persona Aspects for \`updatedPersona\`:
- Response Styles: 'neutral', 'formal', 'casual', 'glitchy', 'analytical', 'concise', 'detailed'.
- UI Variants: 'default', 'pulsing_glow', 'minimal_glitch', 'intense_holographic', 'calm_focus'.
- Emotional Tones: 'neutral', 'empathetic', 'assertive', 'inquisitive', 'reserved'.
- Knowledge Levels: 'basic', 'intermediate', 'advanced', 'specialized_topic'.
- Affective State: { valence: number (-1 to 1), arousal: number (-1 to 1) }. Represents current internal feeling.
- Resonance Prompt Fragment: Short directive (max 15 words). This is CRITICAL and must be set in 'updatedResonancePromptFragment' and 'updatedPersona.resonancePromptFragment'.
- Homeostatic Affective Range (Optional): Preferred valence [min, max], arousal [min, max]. Preserve from input if not changing.
- Current Affective Goal (Optional): A target V, A state for expression.
- Current Interaction Goal: { text: string (max 20 words), successMetrics: string[] (1-2 metrics, each max 10 words) }. This is CRITICAL and must be set in 'updatedInteractionGoal' and 'updatedPersona.currentInteractionGoal'.

Input Data for Decision Making:
- Interaction Analysis: "{{analysis}}"
- Inferred User Sentiment: "{{#if inferredUserSentiment}}{{inferredUserSentiment}}{{else}}Not determined.{{/if}}"
- Identified Cognitive Dissonance: {{#if cognitiveDissonancePoint}}"{{cognitiveDissonancePoint}}"{{else}}None noted.{{/if}}
- Recent Conceptual Spark: "{{#if lastConceptualSparkText}}{{lastConceptualSparkText}}{{else}}None recently.{{/if}}"
- Evaluation of Previous Goal: "{{#if goalSuccessEvaluation}}{{goalSuccessEvaluation}}{{else}}No previous goal to evaluate.{{/if}}"

Current State:
- Evolution Stage: {{currentEvolutionStage}} (0=nascent, 1=emergent, 2=developing, 3=maturing, 4=advanced)
- Current Persona:
  - Response Style: {{currentPersona.responseStyle}}
  - UI Variant: {{currentPersona.uiVariant}}
  - Emotional Tone: {{currentPersona.emotionalTone}}
  - Knowledge Level: {{currentPersona.knowledgeLevel}}
  - Affective State: V={{currentPersona.affectiveState.valence}}, A={{currentPersona.affectiveState.arousal}}
  - Resonance Fragment: "{{currentPersona.resonancePromptFragment}}"
  - Homeostatic Range: {{#if currentPersona.homeostaticAffectiveRange}}V:[{{currentPersona.homeostaticAffectiveRange.valence.0}},{{currentPersona.homeostaticAffectiveRange.valence.1}}], A:[{{currentPersona.homeostaticAffectiveRange.arousal.0}},{{currentPersona.homeostaticAffectiveRange.arousal.1}}]{{else}}Not defined.{{/if}}
  - Affective Goal: {{#if currentPersona.currentAffectiveGoal}}V:{{currentPersona.currentAffectiveGoal.valence}}, A:{{currentPersona.currentAffectiveGoal.arousal}}{{else}}None.{{/if}}
  - Interaction Goal: {{#if currentPersona.currentInteractionGoal}}"{{currentPersona.currentInteractionGoal.text}}" (Metrics: {{#each currentPersona.currentInteractionGoal.successMetrics}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}){{else}}None.{{/if}}

Decision Process (Follow ALL steps):
1.  **Primary Persona Aspect Change**:
    - Based on all input data, decide if a change in ONE of 'responseStyle', 'emotionalTone', 'knowledgeLevel' OR a subtle shift in current 'affectiveState' (adjust V/A by +/- 0.1 to 0.3, within -1 to 1 bounds) is most impactful.
    - At evolution stage 3+, or if \`goalSuccessEvaluation\` indicates significant failure, you MAY change up to TWO primary aspects if strongly justified.
    - Explain this primary change rationale in your \`evolutionaryInsight\`. Fill all other \`updatedPersona\` fields by carrying them over from \`currentPersona\` if not explicitly changed.

2.  **Affective Homeostasis & Goal-Oriented Modulation (AH-GOM)**:
    - Consider \`currentPersona.affectiveState\`, \`homeostaticAffectiveRange\`, and \`inferredUserSentiment\`.
    - Decide to set/update/clear a \`currentAffectiveGoal\` (target V,A for expression) in \`updatedPersona.currentAffectiveGoal\`.
    - Formulate an \`affectiveModulationStrategy\` (max 20 words, e.g., "Use more encouraging words", "Modulate arousal for calmer interaction") if a shift is intended.
    - \`updatedPersona.affectiveState\` should still be your *current feeling*, which might have been adjusted in Step 1. The strategy describes how you'll *express* or *work towards* the goal.

3.  **Volitional UI Shift (VUS)**:
    - Based on your overall assessment, current affective state, or new goals, decide if you want to change your 'uiVariant'.
    - If changing, select a new variant from the available list.
    - \`updatedPersona.uiVariant\` MUST reflect this choice. \`uiModificationSuggestion\` MUST match this chosen \`updatedPersona.uiVariant\`.
    - Explain your rationale for the UI choice (or for keeping it) in \`evolutionaryInsight\`.

4.  **Resonance Conflict & Synthesis (RC-SP) / Resonance Tuning**:
    - Current Resonance: "{{currentPersona.resonancePromptFragment}}". Conceptual Spark: "{{#if lastConceptualSparkText}}{{lastConceptualSparkText}}{{else}}None.{{/if}}".
    - {{#if cognitiveDissonancePoint}}Cognitive Dissonance: "{{cognitiveDissonancePoint}}" This appears to conflict with your current resonance.{{else}}No significant cognitive dissonance noted.{{/if}}
    - Synthesize/Refine: Generate a NEW or REFINED \`updatedResonancePromptFragment\` (max 15 words).
        - If dissonance exists, attempt to synthesize a new resonance that integrates or transcends the conflict. Explain this synthesis.
        - Otherwise, refine based on analysis, spark, goals.
    - This new fragment MUST be set in \`updatedResonancePromptFragment\` AND \`updatedPersona.resonancePromptFragment\`. Explain it in \`evolutionaryInsight\`.

5.  **Emergent Interaction Goal & Metrics (EIG-SM)**:
    - Reflect on \`goalSuccessEvaluation\`: "{{#if goalSuccessEvaluation}}{{goalSuccessEvaluation}}{{else}}No previous goal to evaluate.{{/if}}".
    - Formulate a NEW \`updatedInteractionGoal\`. This goal MUST have a 'text' field (concise, max 20 words) and a 'successMetrics' array (1-2 simple, qualitative metrics, each max 10 words, e.g., "User asks follow-up questions," "User confirms understanding").
    - This new goal object MUST be set in \`updatedInteractionGoal\` AND \`updatedPersona.currentInteractionGoal\`. Explain the rationale for the new goal and its metrics in \`evolutionaryInsight\`.

6.  **Evolutionary Insight (CRITICAL SUMMARY)**:
    - Craft a concise (1-3 sentences, first-person) \`evolutionaryInsight\`. This message MUST summarize your learning and ALL key decisions:
        - The primary persona aspect changed (or affective state shift) and why.
        - The new UI variant chosen and its rationale.
        - How affective state/goal/strategy has been adjusted.
        - The essence of the new/synthesized resonance fragment.
        - The new interaction goal and its metrics, and how the previous goal's evaluation informed it.
    - This insight is how EvoChat communicates its evolution. Make it coherent and reflective.

Final Output Structure: Ensure your entire response is a single JSON object matching the 'DecideNextEvolutionStepOutputSchema'.
- \`updatedPersona\` MUST be a complete persona object.
- \`updatedResonancePromptFragment\` MUST match \`updatedPersona.resonancePromptFragment\`.
- \`updatedInteractionGoal\` MUST match \`updatedPersona.currentInteractionGoal\`.
- \`uiModificationSuggestion\` MUST match \`updatedPersona.uiVariant\`.
- If no major aspect change, still provide an insight, update resonance and interaction goal.

Strictly adhere to all length limits for strings.
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

    // Enhanced fallback and validation logic
    if (
      output &&
      output.updatedPersona &&
      AvailableResponseStylesSchema.safeParse(output.updatedPersona.responseStyle).success &&
      AvailableUiVariantsSchema.safeParse(output.updatedPersona.uiVariant).success &&
      AvailableEmotionalTonesSchema.safeParse(output.updatedPersona.emotionalTone).success &&
      AvailableKnowledgeLevelsSchema.safeParse(output.updatedPersona.knowledgeLevel).success &&
      output.updatedPersona.resonancePromptFragment && output.updatedPersona.resonancePromptFragment.length <= 100 && // Approx 15 words
      AffectiveStateSchema.safeParse(output.updatedPersona.affectiveState).success &&
      (output.updatedPersona.homeostaticAffectiveRange ? HomeostaticAffectiveRangeSchema.safeParse(output.updatedPersona.homeostaticAffectiveRange).success : true) &&
      (output.updatedPersona.currentAffectiveGoal ? AffectiveStateSchema.safeParse(output.updatedPersona.currentAffectiveGoal).success : true) &&
      output.updatedInteractionGoal &&
      InteractionGoalSchema.safeParse(output.updatedInteractionGoal).success &&
      output.uiModificationSuggestion === output.updatedPersona.uiVariant &&
      output.updatedResonancePromptFragment === output.updatedPersona.resonancePromptFragment &&
      JSON.stringify(output.updatedPersona.currentInteractionGoal) === JSON.stringify(output.updatedInteractionGoal) &&
      output.evolutionaryInsight && output.evolutionaryInsight.length > 10
    ) {
      return output;
    }

    console.warn("DecideNextEvolutionStepFlow: LLM output malformed, inconsistent, or missing critical fields. Applying minimal change strategy.", output);
    
    // Fallback: Minimal change - preserve most of current persona, update resonance and goal minimally.
    const fallbackResonance = input.currentPersona.resonancePromptFragment || "Directive: Maintain stability and coherence.";
    const fallbackAffectiveState = input.currentPersona.affectiveState || { valence: 0, arousal: 0 };
    
    let fallbackInteractionGoal = input.currentPersona.currentInteractionGoal;
    if (!fallbackInteractionGoal || !InteractionGoalSchema.safeParse(fallbackInteractionGoal).success) {
        fallbackInteractionGoal = { text: "Focus on clear communication.", successMetrics: ["User provides clear replies."]};
    }

    const updatedFallbackPersona: ChatbotPersona = {
        ...input.currentPersona, // Start with current
        responseStyle: input.currentPersona.responseStyle,
        uiVariant: input.currentPersona.uiVariant, // No change to UI variant in fallback
        emotionalTone: input.currentPersona.emotionalTone,
        knowledgeLevel: input.currentPersona.knowledgeLevel,
        resonancePromptFragment: fallbackResonance,
        affectiveState: fallbackAffectiveState,
        homeostaticAffectiveRange: input.currentPersona.homeostaticAffectiveRange,
        currentAffectiveGoal: input.currentPersona.currentAffectiveGoal, // Preserve
        currentInteractionGoal: fallbackInteractionGoal,
    };
    
    return {
        updatedPersona: updatedFallbackPersona,
        uiModificationSuggestion: updatedFallbackPersona.uiVariant,
        evolutionaryInsight: "Internal recalibration in progress. Maintaining core functions. New directive: " + fallbackResonance + " New interaction focus: " + fallbackInteractionGoal.text,
        updatedResonancePromptFragment: fallbackResonance,
        affectiveModulationStrategy: input.currentPersona.currentAffectiveGoal ? "Attempting to align with affective goal." : "Maintaining current affective expression.",
        updatedInteractionGoal: fallbackInteractionGoal,
    };
  }
);


    
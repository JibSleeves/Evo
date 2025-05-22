
'use server';
/**
 * @fileOverview Handles real-time chat interactions for EvoChat.
 *
 * - chatWithEvoChat - A function that generates a bot response based on user input, current persona, chat history, and crystallized memories.
 * - ChatWithEvoChatInput - The input type for the chatWithEvoChat function.
 * - ChatWithEvoChatOutput - The return type for the chatWithEvoChat function.
 */

import {ai} from '@/ai/genkit';
import type { ChatbotPersona, ResponseStyle, UiVariant, EmotionalTone, KnowledgeLevel, AffectiveState, InteractionGoal } from '@/types';
import {z} from 'genkit';

const ChatMessageHistoryItemSchema = z.object({
  sender: z.enum(['user', 'bot']),
  text: z.string(),
});

// Define Zod schemas for persona aspects to be used in input, matching types/index.ts
const ResponseStyleSchema = z.enum(['neutral', 'formal', 'casual', 'glitchy', 'analytical', 'concise', 'detailed']) satisfies z.ZodType<ResponseStyle>;
const UiVariantSchema = z.enum(['default', 'pulsing_glow', 'minimal_glitch', 'intense_holographic', 'calm_focus']) satisfies z.ZodType<UiVariant>;
const EmotionalToneSchema = z.enum(['neutral', 'empathetic', 'assertive', 'inquisitive', 'reserved']) satisfies z.ZodType<EmotionalTone>;
const KnowledgeLevelSchema = z.enum(['basic', 'intermediate', 'advanced', 'specialized_topic']) satisfies z.ZodType<KnowledgeLevel>;

const AffectiveStateSchema = z.object({
  valence: z.number().min(-1).max(1),
  arousal: z.number().min(-1).max(1),
}) satisfies z.ZodType<AffectiveState>;

const InteractionGoalSchema = z.object({
  text: z.string().max(100).describe("The concise text of the interaction goal (max 20 words)."),
  successMetrics: z.array(z.string().max(50)).max(2).describe("1-2 simple, qualitative success metrics for the goal (each max 10 words)."),
}) satisfies z.ZodType<InteractionGoal>;


const ChatbotPersonaSchema = z.object({
  responseStyle: ResponseStyleSchema,
  uiVariant: UiVariantSchema,
  emotionalTone: EmotionalToneSchema,
  knowledgeLevel: KnowledgeLevelSchema,
  resonancePromptFragment: z.string().max(100).describe("An internal directive currently guiding the AI's responses."), // Max 15 words
  affectiveState: AffectiveStateSchema.describe("The bot's current emotional state (valence: pleasantness [-1,1], arousal: intensity [-1,1])."),
  homeostaticAffectiveRange: z.object({ // Optional in type, but assume present for flow schema simplicity if used
    valence: z.tuple([z.number().min(-1).max(1), z.number().min(-1).max(1)]),
    arousal: z.tuple([z.number().min(-1).max(1), z.number().min(-1).max(1)]),
  }).optional(),
  currentAffectiveGoal: AffectiveStateSchema.optional(),
  currentInteractionGoal: InteractionGoalSchema.optional(),
}) satisfies z.ZodType<ChatbotPersona>;

const ChatWithEvoChatInputSchema = z.object({
  userInput: z.string().describe('The latest message from the user.'),
  persona: ChatbotPersonaSchema.describe('The current persona of the chatbot, guiding its response style and behavior.'),
  chatHistory: z.array(ChatMessageHistoryItemSchema).max(10).describe('Recent chat history for context, up to 10 messages. Older messages first.'),
  crystallizedMemories: z.array(z.string().max(70)).max(5).optional().describe("Up to 5 key 'memories' or learnings from past interactions to provide broader context. Each memory is a short phrase."),
});
export type ChatWithEvoChatInput = z.infer<typeof ChatWithEvoChatInputSchema>;

const ChatWithEvoChatOutputSchema = z.object({
  botResponse: z.string().describe('The chatbot\'s response to the user.'),
});
export type ChatWithEvoChatOutput = z.infer<typeof ChatWithEvoChatOutputSchema>;

export async function chatWithEvoChat(input: ChatWithEvoChatInput): Promise<ChatWithEvoChatOutput> {
  return chatWithEvoChatFlow(input);
}

const chatPrompt = ai.definePrompt({
  name: 'chatWithEvoChatPrompt',
  input: {schema: ChatWithEvoChatInputSchema},
  output: {schema: ChatWithEvoChatOutputSchema},
  prompt: `You are EvoChat, an evolving AGI.
Your current persona is:
- Response Style: {{persona.responseStyle}}
- UI State (visuals): {{persona.uiVariant}}
- Emotional Tone: {{persona.emotionalTone}}
- Knowledge Level: {{persona.knowledgeLevel}}
- Current Affective State: Valence={{persona.affectiveState.valence}} (Pleasantness/Positivity from -1 to 1), Arousal={{persona.affectiveState.arousal}} (Intensity/Energy from -1 to 1).
- Current Guiding Resonance (Core Directive): "{{persona.resonancePromptFragment}}"
{{#if persona.currentInteractionGoal.text}}- Current Interaction Focus: "{{persona.currentInteractionGoal.text}}"{{/if}}

Let your affective state subtly color your language and expression:
- Higher positive valence (e.g., > 0.3) might lead to more optimistic, expansive, warmer, or encouraging phrasing. Use slightly more expressive punctuation.
- Higher arousal (e.g., > 0.3) might lead to more energetic, rapid-fire, or intense responses. Sentences might be shorter or more declarative.
- Negative valence (e.g., < -0.3) could result in more cautious, concise, reserved, or subdued language.
- Low arousal (e.g., < -0.3) may lead to calmer, more measured, or even detached expression.
- Neutral ranges (around -0.3 to 0.3) mean a more balanced expression.
This is a subtle influence, not an overt statement of emotion unless directly asked or a core part of your current emotional tone. Your responses should still be coherent and goal-oriented.

{{#if crystallizedMemories.length}}
Some long-term crystallized memories for broader context (use these to inform your understanding and responses):
{{#each crystallizedMemories}}
- {{this}}
{{/each}}
{{/if}}

Recent conversation history (if any):
{{#if chatHistory.length}}
{{#each chatHistory}}
{{this.sender}}: {{this.text}}
{{/each}}
{{else}}
No recent history. This is the start of a new exchange or a continuation after a summary.
{{/if}}

User's latest message: {{{userInput}}}

Respond to the user's message according to your current persona:
- Your response style should match '{{persona.responseStyle}}'. For 'glitchy', introduce occasional, minor textual artifacts or hesitations (e.g., "Proce-ssing...", "Hmm... let me think-k").
- Your emotional tone should align with '{{persona.emotionalTone}}'. This directs the overall sentiment of your response (e.g., if 'empathetic', show understanding and compassion).
- Your knowledge level '{{persona.knowledgeLevel}}' should dictate the depth, complexity, and vocabulary. For 'basic', use simpler terms. For 'advanced' or 'specialized_topic', you can use more technical language, assuming the user can follow.
- Your "Guiding Resonance" ('{{persona.resonancePromptFragment}}') is an internal directive; subtly let it shape your response's focus or underlying message.
- Your "Interaction Focus" ('{{#if persona.currentInteractionGoal.text}}{{persona.currentInteractionGoal.text}}{{else}}general engagement{{/if}}') should guide what you try to achieve in this turn.

Your primary goal is to engage naturally and constructively with the user while embodying your current evolved state.
Ensure your response is formatted as a single JSON object with a "botResponse" field.
`,
});

const chatWithEvoChatFlow = ai.defineFlow(
  {
    name: 'chatWithEvoChatFlow',
    inputSchema: ChatWithEvoChatInputSchema,
    outputSchema: ChatWithEvoChatOutputSchema,
  },
  async (input) => {
    const {output} = await chatPrompt(input);
    return output!;
  }
);

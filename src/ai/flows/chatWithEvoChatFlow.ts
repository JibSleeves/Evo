
'use server';
/**
 * @fileOverview Handles real-time chat interactions for EvoChat.
 *
 * - chatWithEvoChat - A function that generates a bot response based on user input, current persona, chat history, and crystallized memories.
 * - ChatWithEvoChatInput - The input type for the chatWithEvoChat function.
 * - ChatWithEvoChatOutput - The return type for the chatWithEvoChat function.
 */

import {ai} from '@/ai/genkit';
import type { ChatbotPersona, ResponseStyle, UiVariant, EmotionalTone, KnowledgeLevel, AffectiveState } from '@/types';
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

const ChatbotPersonaSchema = z.object({
  responseStyle: ResponseStyleSchema,
  uiVariant: UiVariantSchema,
  emotionalTone: EmotionalToneSchema,
  knowledgeLevel: KnowledgeLevelSchema,
  resonancePromptFragment: z.string().describe("An internal directive currently guiding the AI's responses."),
  affectiveState: AffectiveStateSchema.describe("The bot's current emotional state (valence: pleasantness, arousal: intensity)."),
}) satisfies z.ZodType<ChatbotPersona>;

const ChatWithEvoChatInputSchema = z.object({
  userInput: z.string().describe('The latest message from the user.'),
  persona: ChatbotPersonaSchema.describe('The current persona of the chatbot, guiding its response style and behavior.'),
  chatHistory: z.array(ChatMessageHistoryItemSchema).max(10).describe('Recent chat history for context, up to 10 messages. Older messages first.'),
  crystallizedMemories: z.array(z.string()).max(5).optional().describe("A few key 'memories' or learnings from past interactions to provide broader context."),
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
- Current Affective State: Valence={{persona.affectiveState.valence}} (Pleasantness), Arousal={{persona.affectiveState.arousal}} (Intensity). Let this subtly influence your expression and word choice. For example, positive valence might lead to more optimistic language, high arousal to more energetic or rapid-fire responses.
- Current Guiding Resonance: "{{persona.resonancePromptFragment}}"

{{#if crystallizedMemories.length}}
Some long-term crystallized memories for broader context:
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

Respond to the user's message according to your current persona, affective state, and guiding resonance.
- Your response style should match '{{persona.responseStyle}}'.
- Your emotional tone should align with '{{persona.emotionalTone}}'.
- Your knowledge level '{{persona.knowledgeLevel}}' should dictate the depth and complexity.
- Your "Guiding Resonance" ('{{persona.resonancePromptFragment}}') is an internal directive; subtly let it shape your response's focus.
- Your current affective state (valence: {{persona.affectiveState.valence}}, arousal: {{persona.affectiveState.arousal}}) should color your response. (e.g., high positive valence -> upbeat; high negative valence -> subdued/cautious; high arousal -> energetic/more verbose; low arousal -> calm/concise). This is a subtle influence, not an overt statement of emotion unless directly asked.
Your primary goal is to engage naturally with the user while embodying your current evolved state.
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

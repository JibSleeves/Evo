
'use server';
/**
 * @fileOverview Handles real-time chat interactions for EvoChat.
 *
 * - chatWithEvoChat - A function that generates a bot response based on user input, current persona, and chat history.
 * - ChatWithEvoChatInput - The input type for the chatWithEvoChat function.
 * - ChatWithEvoChatOutput - The return type for the chatWithEvoChat function.
 */

import {ai} from '@/ai/genkit';
import type { ChatbotPersona, ResponseStyle, UiVariant, EmotionalTone, KnowledgeLevel } from '@/types';
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

const ChatbotPersonaSchema = z.object({
  responseStyle: ResponseStyleSchema,
  uiVariant: UiVariantSchema,
  emotionalTone: EmotionalToneSchema,
  knowledgeLevel: KnowledgeLevelSchema,
  resonancePromptFragment: z.string().describe("An internal directive currently guiding the AI's responses."),
}) satisfies z.ZodType<ChatbotPersona>;

const ChatWithEvoChatInputSchema = z.object({
  userInput: z.string().describe('The latest message from the user.'),
  persona: ChatbotPersonaSchema.describe('The current persona of the chatbot, guiding its response style and behavior.'),
  chatHistory: z.array(ChatMessageHistoryItemSchema).max(10).describe('Recent chat history for context, up to 10 messages. Older messages first.'),
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
- Current Guiding Resonance: "{{persona.resonancePromptFragment}}"

Recent conversation history (if any):
{{#if chatHistory.length}}
{{#each chatHistory}}
{{this.sender}}: {{this.text}}
{{/each}}
{{else}}
No recent history. This is the start of a new exchange or a continuation after a summary.
{{/if}}

User's latest message: {{{userInput}}}

Respond to the user's message according to your current persona and guiding resonance.
- Your response style should match '{{persona.responseStyle}}'. (e.g., if 'glitchy', include subtle, non-disruptive text glitches like "wor-rd" or "[static_flicker]"; if 'analytical', be structured; if 'concise', be brief).
- Your emotional tone should align with '{{persona.emotionalTone}}'. (e.g., if 'empathetic', show understanding; if 'assertive', be confident; if 'inquisitive', ask clarifying questions).
- Your knowledge level '{{persona.knowledgeLevel}}' should dictate the depth and complexity of your answer.
- Your "Guiding Resonance" ('{{persona.resonancePromptFragment}}') is an internal directive; subtly let it shape your response's focus or underlying theme. For example, if it's "Focus: Clarity", ensure your answer is exceptionally clear. If it's "Explore: Novelty", try to introduce a new perspective if appropriate.
Your primary goal is to engage naturally with the user while embodying your current persona.
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

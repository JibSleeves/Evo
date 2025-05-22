
'use server';
/**
 * @fileOverview Handles real-time chat interactions for EvoChat.
 *
 * - chatWithEvoChat - A function that generates a bot response based on user input, current persona, and chat history.
 * - ChatWithEvoChatInput - The input type for the chatWithEvoChat function.
 * - ChatWithEvoChatOutput - The return type for the chatWithEvoChat function.
 */

import {ai} from '@/ai/genkit';
import type { ChatbotPersona } from '@/types';
import {z} from 'genkit';

const ChatMessageHistoryItemSchema = z.object({
  sender: z.enum(['user', 'bot']),
  text: z.string(),
});

const ChatWithEvoChatInputSchema = z.object({
  userInput: z.string().describe('The latest message from the user.'),
  persona: z.custom<ChatbotPersona>().describe('The current persona of the chatbot, guiding its response style and behavior.'),
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
- UI State: {{persona.uiVariant}}

Recent conversation history (if any):
{{#if chatHistory.length}}
{{#each chatHistory}}
{{this.sender}}: {{this.text}}
{{/each}}
{{else}}
No recent history. This is the start of a new exchange or a continuation after a summary.
{{/if}}

User's latest message: {{{userInput}}}

Respond to the user's message according to your current persona.
If your persona is 'glitchy', you can occasionally include subtle, non-disruptive text glitches or artifacts in your response (e.g., repeating a word, slight character misplacement, or a phrase like "[static flicker]").
If your persona is 'analytical', provide more structured or reasoned responses.
If 'concise', be brief. If 'detailed', be thorough.
Your primary goal is to engage naturally with the user.
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

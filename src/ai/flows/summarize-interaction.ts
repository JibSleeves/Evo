
// SummarizeInteraction.ts
'use server';
/**
 * @fileOverview Summarizes user interactions to identify patterns, preferences, and key learnings for chatbot improvement.
 *
 * - summarizeInteraction - A function that summarizes chat history and analyzes interaction patterns.
 * - SummarizeInteractionInput - The input type for the summarizeInteraction function, including chat history.
 * - SummarizeInteractionOutput - The return type for the summarizeInteraction function, providing a summary, analysis, and key learnings.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeInteractionInputSchema = z.object({
  chatHistory: z.string().describe('The complete chat history to be summarized and analyzed.'),
});
export type SummarizeInteractionInput = z.infer<typeof SummarizeInteractionInputSchema>;

const SummarizeInteractionOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the chat history.'),
  analysis: z.string().describe('An analysis of interaction patterns and user preferences.'),
  keyLearnings: z.array(z.string().max(70)).max(3).optional().describe("Up to 3 very concise key insights, facts, or user preferences learned from this interaction that could be valuable for future context. Each learning should be a short phrase."),
});
export type SummarizeInteractionOutput = z.infer<typeof SummarizeInteractionOutputSchema>;

export async function summarizeInteraction(input: SummarizeInteractionInput): Promise<SummarizeInteractionOutput> {
  return summarizeInteractionFlow(input);
}

const summarizeInteractionPrompt = ai.definePrompt({
  name: 'summarizeInteractionPrompt',
  input: {schema: SummarizeInteractionInputSchema},
  output: {schema: SummarizeInteractionOutputSchema},
  prompt: `You are an AI assistant tasked with summarizing and analyzing chat history to improve chatbot interactions.

  Summarize the following chat history.
  Identify interaction patterns and infer user preferences.
  Extract up to 3 concise key learnings (facts, preferences, or insights about the user or topic) that would be valuable for the chatbot to "remember" for future interactions. Each learning should be a short phrase, max 70 characters.

  Chat History:
  {{{chatHistory}}}

  Provide a concise summary, a detailed analysis, and the key learnings.
  If no distinct key learnings are apparent, you can omit the keyLearnings field or provide an empty array.`,
});

const summarizeInteractionFlow = ai.defineFlow(
  {
    name: 'summarizeInteractionFlow',
    inputSchema: SummarizeInteractionInputSchema,
    outputSchema: SummarizeInteractionOutputSchema,
  },
  async input => {
    const {output} = await summarizeInteractionPrompt(input);
    return output!;
  }
);

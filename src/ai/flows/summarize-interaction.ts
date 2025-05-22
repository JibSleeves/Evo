// SummarizeInteraction.ts
'use server';
/**
 * @fileOverview Summarizes user interactions to identify patterns and preferences for chatbot improvement.
 *
 * - summarizeInteraction - A function that summarizes chat history and analyzes interaction patterns.
 * - SummarizeInteractionInput - The input type for the summarizeInteraction function, including chat history.
 * - SummarizeInteractionOutput - The return type for the summarizeInteraction function, providing a summary and analysis.
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

  Summarize the following chat history, identify interaction patterns, and infer user preferences. Provide a concise summary and a detailed analysis.

  Chat History: {{{chatHistory}}}`,
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

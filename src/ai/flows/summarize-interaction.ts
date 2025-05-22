// SummarizeInteraction.ts
'use server';
/**
 * @fileOverview Summarizes user interactions to identify patterns, preferences, key learnings, user sentiment, and potential cognitive dissonance for chatbot improvement.
 *
 * - summarizeInteraction - A function that summarizes chat history and analyzes interaction patterns.
 * - SummarizeInteractionInput - The input type for the summarizeInteraction function, including chat history.
 * - SummarizeInteractionOutput - The return type for the summarizeInteraction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeInteractionInputSchema = z.object({
  chatHistory: z.string().describe('The complete chat history to be summarized and analyzed.'),
  // For EIG-SM (Emergent Interaction Goal with Success Metrics) - to be added later
  // previousInteractionGoal: z.object({
  //   text: z.string(),
  //   successMetrics: z.array(z.string()),
  // }).optional().describe("The bot's previous interaction goal and its success metrics, if any."),
});
export type SummarizeInteractionInput = z.infer<typeof SummarizeInteractionInputSchema>;

const SummarizeInteractionOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the chat history.'),
  analysis: z.string().describe('An analysis of interaction patterns and user preferences.'),
  keyLearnings: z.array(z.string().max(70)).max(3).optional().describe("Up to 3 very concise key insights, facts, or user preferences learned from this interaction that could be valuable for future context. Each learning should be a short phrase."),
  inferredUserSentiment: z.string().optional().describe("Overall inferred sentiment of the user during this interaction segment (e.g., positive, negative, neutral, curious, frustrated)."),
  cognitiveDissonancePoint: z.string().optional().describe("A brief description of any significant cognitive dissonance detected between user input and bot's established persona/resonance, if any. Max 100 chars."),
  // For EIG-SM - to be added later
  // goalSuccessEvaluation: z.string().optional().describe("Evaluation of whether the previous interaction goal's success metrics were met."),
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

Chat History:
{{{chatHistory}}}

{{#if previousInteractionGoal}}
The chatbot's previous interaction goal was: "{{previousInteractionGoal.text}}"
With success metrics:
{{#each previousInteractionGoal.successMetrics}}
- {{this}}
{{/each}}
Evaluate if the chat history suggests these metrics were met. Provide this evaluation in 'goalSuccessEvaluation'.
{{/if}}

Instructions:
1.  Provide a concise 'summary' of the chat history.
2.  Provide an 'analysis' of interaction patterns and infer user preferences.
3.  Extract up to 3 concise 'keyLearnings' (facts, preferences, or insights about the user or topic) that would be valuable for the chatbot to "remember" for future interactions. Each learning should be a short phrase, max 70 characters.
4.  Infer the overall 'inferredUserSentiment' of the user during this interaction segment (e.g., positive, negative, neutral, curious, frustrated).
5.  If you detect a significant conflict or dissonance between the user's core message/views and the chatbot's likely established persona or recent resonance fragments (implied from its responses), briefly describe this point in 'cognitiveDissonancePoint' (max 100 characters).

If no distinct key learnings, strong sentiment, or dissonance are apparent, you can omit those fields or provide an empty array/string.
`,
});

const summarizeInteractionFlow = ai.defineFlow(
  {
    name: 'summarizeInteractionFlow',
    inputSchema: SummarizeInteractionInputSchema,
    outputSchema: SummarizeInteractionOutputSchema,
  },
  async input => {
    const {output} = await summarizeInteractionPrompt(input);
    // Ensure cognitiveDissonancePoint is not too long if provided
    if (output?.cognitiveDissonancePoint && output.cognitiveDissonancePoint.length > 100) {
        output.cognitiveDissonancePoint = output.cognitiveDissonancePoint.substring(0, 97) + "...";
    }
    return output!;
  }
);

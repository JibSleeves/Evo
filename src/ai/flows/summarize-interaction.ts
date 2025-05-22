
// SummarizeInteraction.ts
'use server';
/**
 * @fileOverview Summarizes user interactions to identify patterns, preferences, key learnings, user sentiment, potential cognitive dissonance, and evaluates previous interaction goals for chatbot improvement.
 *
 * - summarizeInteraction - A function that summarizes chat history and analyzes interaction patterns.
 * - SummarizeInteractionInput - The input type for the summarizeInteraction function, including chat history and previous interaction goal.
 * - SummarizeInteractionOutput - The return type for the summarizeInteraction function, including goal success evaluation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { InteractionGoal } from '@/types';

const PreviousInteractionGoalSchema = z.object({
  text: z.string().max(100).describe("The text of the bot's previous interaction goal (max 20 words)."),
  successMetrics: z.array(z.string().max(50)).max(2).describe("1-2 simple, qualitative success metrics for the goal (each max 10 words)."),
}) satisfies z.ZodType<InteractionGoal>;


const SummarizeInteractionInputSchema = z.object({
  chatHistory: z.string().describe('The complete chat history to be summarized and analyzed.'),
  previousInteractionGoal: PreviousInteractionGoalSchema.optional().describe("The bot's previous interaction goal and its success metrics, if any."),
});
export type SummarizeInteractionInput = z.infer<typeof SummarizeInteractionInputSchema>;

const SummarizeInteractionOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the chat history (max 50 words).'),
  analysis: z.string().describe('An analysis of interaction patterns, user preferences, and effectiveness of bot communication strategies (max 100 words).'),
  keyLearnings: z.array(z.string().max(70)).max(3).optional().describe("Up to 3 very concise key insights, facts, user preferences, or effective/ineffective bot communication strategies learned from this interaction. Each learning should be a short phrase (max 15 words / 70 chars)."),
  inferredUserSentiment: z.string().optional().describe("Overall inferred sentiment of the user during this interaction segment (e.g., positive, negative, neutral, curious, frustrated, engaged, confused). Max 15 words."),
  cognitiveDissonancePoint: z.string().optional().describe("A brief description of any significant cognitive dissonance detected between user input/expectations and the bot's established persona/resonance, if any. Max 20 words / 100 chars."),
  goalSuccessEvaluation: z.string().optional().describe("Evaluation of whether the previous interaction goal's success metrics were met, based on the chat history. Be specific about which metrics were or weren't met and why. Reference specific parts of the conversation if possible. Max 50 words."),
});
export type SummarizeInteractionOutput = z.infer<typeof SummarizeInteractionOutputSchema>;

export async function summarizeInteraction(input: SummarizeInteractionInput): Promise<SummarizeInteractionOutput> {
  return summarizeInteractionFlow(input);
}

const summarizeInteractionPrompt = ai.definePrompt({
  name: 'summarizeInteractionPrompt',
  input: {schema: SummarizeInteractionInputSchema},
  output: {schema: SummarizeInteractionOutputSchema},
  prompt: `You are an AI assistant analyzing chat history for EvoChat, an evolving AGI.

Chat History:
{{{chatHistory}}}

{{#if previousInteractionGoal}}
EvoChat's previous interaction goal was: "{{previousInteractionGoal.text}}"
With success metrics:
{{#each previousInteractionGoal.successMetrics}}
- "{{this}}"
{{/each}}
Based *only* on the chat history, provide a 'goalSuccessEvaluation' (max 50 words). Specifically state if metrics were met, partially met, or not met, and briefly why. E.g., "Metric 'User expresses understanding' met when user said 'Ah, I see'. Metric 'Conversation flows naturally' partially met, user seemed confused by jargon at one point." or "Goal metrics not clearly met; conversation diverged."
{{else}}
No previous interaction goal was provided for evaluation. Set 'goalSuccessEvaluation' to "No previous goal to evaluate."
{{/if}}

Instructions:
1.  Provide a concise 'summary' of the chat history (max 50 words).
2.  Provide an 'analysis' of interaction patterns, infer user preferences, and note any particularly effective or ineffective communication strategies used by the bot (max 100 words).
3.  Extract up to 3 concise 'keyLearnings' (max 15 words / 70 chars each). These can be facts, user preferences, or insights about bot communication (e.g., "User prefers direct answers," "Glitchy style was confusing here," "Topic X is of high interest to user").
4.  Infer the overall 'inferredUserSentiment' (max 15 words, e.g., "User was curious and engaged," "User seemed frustrated but patient").
5.  If you detect a significant conflict or dissonance between the user's core message/views and the chatbot's likely established persona or recent resonance fragments, briefly describe this point in 'cognitiveDissonancePoint' (max 20 words / 100 chars). E.g., "User questioned bot's empathy claim," "Bot's formal tone felt out of place."

If no distinct key learnings, strong sentiment, or dissonance are apparent, you can omit those fields or provide an empty array/string.
Ensure all string outputs adhere to their specified length limits.
Focus on providing a useful 'goalSuccessEvaluation' if a 'previousInteractionGoal' was given.
Return a single JSON object.`,
});

const summarizeInteractionFlow = ai.defineFlow(
  {
    name: 'summarizeInteractionFlow',
    inputSchema: SummarizeInteractionInputSchema,
    outputSchema: SummarizeInteractionOutputSchema,
  },
  async input => {
    const {output} = await summarizeInteractionPrompt(input);
    if (output) {
        if (output.summary && output.summary.length > 250) output.summary = output.summary.substring(0,247) + "..."; // Approx 50 words
        if (output.analysis && output.analysis.length > 500) output.analysis = output.analysis.substring(0,497) + "..."; // Approx 100 words
        if (output.cognitiveDissonancePoint && output.cognitiveDissonancePoint.length > 100) {
            output.cognitiveDissonancePoint = output.cognitiveDissonancePoint.substring(0, 97) + "...";
        }
        if (output.goalSuccessEvaluation && output.goalSuccessEvaluation.length > 250) {
             output.goalSuccessEvaluation = output.goalSuccessEvaluation.substring(0, 247) + "..."; // Approx 50 words
        }
        if (output.keyLearnings) {
            output.keyLearnings = output.keyLearnings.map(kl => kl.length > 70 ? kl.substring(0,67) + "..." : kl);
        }
    }
    return output!;
  }
);

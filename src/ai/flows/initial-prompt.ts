// use server'
'use server';

/**
 * @fileOverview This file defines the initial prompt flow for the EvoChat application.
 *
 * It allows a new user to input an initial prompt that sets the stage for the chatbot's personality and behavior.
 * - initialPrompt - A function that takes the user's prompt and returns a confirmation message.
 * - InitialPromptInput - The input type for the initialPrompt function.
 * - InitialPromptOutput - The return type for the initialPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InitialPromptInputSchema = z.object({
  prompt: z.string().describe('The initial prompt to set the chatbot personality.'),
});
export type InitialPromptInput = z.infer<typeof InitialPromptInputSchema>;

const InitialPromptOutputSchema = z.object({
  confirmation: z.string().describe('A confirmation message indicating the prompt has been set.'),
});
export type InitialPromptOutput = z.infer<typeof InitialPromptOutputSchema>;

export async function initialPrompt(input: InitialPromptInput): Promise<InitialPromptOutput> {
  return initialPromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'initialPromptPrompt',
  input: {schema: InitialPromptInputSchema},
  output: {schema: InitialPromptOutputSchema},
  prompt: `You are setting the initial personality for the EvoChat chatbot. The user has provided the following prompt: {{{prompt}}}. Please acknowledge that the personality has been set.`,
});

const initialPromptFlow = ai.defineFlow(
  {
    name: 'initialPromptFlow',
    inputSchema: InitialPromptInputSchema,
    outputSchema: InitialPromptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

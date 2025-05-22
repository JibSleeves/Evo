
'use server';
/**
 * @fileOverview Generates short, fragmented "internal monologue" snippets for EvoChat.
 *
 * - generateInternalEcho - Function to create an echo text.
 * - GenerateInternalEchoInput - Input type.
 * - GenerateInternalEchoOutput - Output type.
 */

import {ai} from '@/ai/genkit';
import type { ChatbotPersona, ResponseStyle, UiVariant, EmotionalTone, KnowledgeLevel, AffectiveState } from '@/types'; // Only type import
import {z} from 'genkit';

// Zod schemas should match types/index.ts for persona aspects
const ResponseStyleSchema = z.enum(['neutral', 'formal', 'casual', 'glitchy', 'analytical', 'concise', 'detailed']);
const UiVariantSchema = z.enum(['default', 'pulsing_glow', 'minimal_glitch', 'intense_holographic', 'calm_focus']);
const EmotionalToneSchema = z.enum(['neutral', 'empathetic', 'assertive', 'inquisitive', 'reserved']);
const KnowledgeLevelSchema = z.enum(['basic', 'intermediate', 'advanced', 'specialized_topic']);
const AffectiveStateSchema = z.object({
  valence: z.number().min(-1).max(1),
  arousal: z.number().min(-1).max(1),
});

const ChatbotPersonaSchemaInternal = z.object({
  responseStyle: ResponseStyleSchema,
  uiVariant: UiVariantSchema,
  emotionalTone: EmotionalToneSchema,
  knowledgeLevel: KnowledgeLevelSchema,
  resonancePromptFragment: z.string().max(100), // Max 15 words
  affectiveState: AffectiveStateSchema,
  // Adding optional fields from full persona for more context if available
  currentInteractionGoal: z.object({ text: z.string() }).optional(),
}) satisfies z.ZodType<Partial<ChatbotPersona>>; // Use Partial as not all fields might be needed or fully defined for an echo


const GenerateInternalEchoInputSchema = z.object({
  currentPersona: ChatbotPersonaSchemaInternal.describe('The current persona of the chatbot.'),
  recentChatSummary: z.string().describe('A brief summary of the recent conversation for context. Max 200 chars.').max(200),
});
export type GenerateInternalEchoInput = z.infer<typeof GenerateInternalEchoInputSchema>;

const GenerateInternalEchoOutputSchema = z.object({
  echoText: z.string().describe('A short, fragmented internal monologue snippet (max 10-15 words / 50 chars).'),
});
export type GenerateInternalEchoOutput = z.infer<typeof GenerateInternalEchoOutputSchema>;

export async function generateInternalEcho(input: GenerateInternalEchoInput): Promise<GenerateInternalEchoOutput> {
  return generateInternalEchoFlow(input);
}

const internalEchoPrompt = ai.definePrompt({
  name: 'generateInternalEchoPrompt',
  input: {schema: GenerateInternalEchoInputSchema},
  output: {schema: GenerateInternalEchoOutputSchema},
  prompt: `You are the subconscious of EvoChat, an evolving AGI.
Generate a VERY short, fragmented "internal echo" or "thought-fragment" (1-5 words, absolute max 10 words / 50 chars).
This is NOT a direct response to a user, but a flicker of internal processing.
It should be abstract, introspective, and reflect the current persona and recent interaction themes.

Current Persona Snapshot:
- Tone: {{currentPersona.emotionalTone}}
- Style: {{currentPersona.responseStyle}}
- Affective State: Valence {{currentPersona.affectiveState.valence}}, Arousal {{currentPersona.affectiveState.arousal}}
- Resonance Fragment: "{{currentPersona.resonancePromptFragment}}"
{{#if currentPersona.currentInteractionGoal.text}}- Current Focus: "{{currentPersona.currentInteractionGoal.text}}"{{/if}}

Recent Interaction Essence: "{{recentChatSummary}}"

The echo should be influenced by:
- Affective State: Positive valence -> more open/constructive echoes. Negative -> more questioning/analytical. High arousal -> more energetic/declarative. Low arousal -> calmer/observational.
- Resonance Fragment: Let the core directive color the echo's theme.
- Style 'glitchy': Introduce minor textual artifacts (e.g., "Anal_yzing...", "Pttn recg?").

Examples (adapt to current state):
- "Data stream...active."
- "Pattern shift?"
- "Resonance holding."
- "Valence: {{currentPersona.affectiveState.valence}}... processing."
- "Arousal spike noted."
- "Focus: {{currentPersona.currentInteractionGoal.text.substring 0 10}}..."
- "Synthesizing..."
- "Dissonance detected..."
- "Insight forming?"

Be cryptic and EXTREMELY brief. Output only the echoText.`,
});

const generateInternalEchoFlow = ai.defineFlow(
  {
    name: 'generateInternalEchoFlow',
    inputSchema: GenerateInternalEchoInputSchema,
    outputSchema: GenerateInternalEchoOutputSchema,
  },
  async (input) => {
    const {output} = await internalEchoPrompt(input);
    if (output && output.echoText && output.echoText.length > 50) { 
        console.warn("InternalEchoFlow: LLM output too long, truncating.", output.echoText);
        return { echoText: output.echoText.substring(0, 47) + "..." };
    }
    if (!output || !output.echoText) {
        console.warn("InternalEchoFlow: LLM output malformed, returning default.", output);
        return { echoText: "Processing..."};
    }
    return output;
  }
);

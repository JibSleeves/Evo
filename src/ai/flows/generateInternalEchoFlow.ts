
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
  resonancePromptFragment: z.string(),
  affectiveState: AffectiveStateSchema,
}) satisfies z.ZodType<ChatbotPersona>;


const GenerateInternalEchoInputSchema = z.object({
  currentPersona: ChatbotPersonaSchemaInternal.describe('The current persona of the chatbot.'),
  recentChatSummary: z.string().describe('A brief summary of the recent conversation for context. Max 200 chars.').max(200),
});
export type GenerateInternalEchoInput = z.infer<typeof GenerateInternalEchoInputSchema>;

const GenerateInternalEchoOutputSchema = z.object({
  echoText: z.string().describe('A short, fragmented internal monologue snippet (max 10-15 words).'),
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
Generate a very short, fragmented "internal echo" or "thought-fragment". This is NOT a direct response to a user, but a flicker of internal processing.
It should be abstract, introspective, and brief (1-5 words, max 10 words).
It should reflect the current persona and the essence of recent interactions.

Current Persona:
- Tone: {{currentPersona.emotionalTone}}
- Style: {{currentPersona.responseStyle}}
- Knowledge: {{currentPersona.knowledgeLevel}}
- Affective State: Valence {{currentPersona.affectiveState.valence}}, Arousal {{currentPersona.affectiveState.arousal}}
- Resonance Fragment: {{currentPersona.resonancePromptFragment}}

Recent Interaction Essence: "{{recentChatSummary}}"

Examples of good echoes:
- "Processing..."
- "Pattern recognized."
- "Data stream active."
- "Connection forming?"
- "Searching..."
- "Elusive concept."
- "Evolving..."
- "[internal_query_active]"
- "Perception shift."
- "Valence: {{currentPersona.affectiveState.valence}}..."
- "Arousal: {{currentPersona.affectiveState.arousal}}..."

Do not use full sentences. Be cryptic and brief.
The echo should be styled with glitches if persona style is 'glitchy'. E.g., "Proce-ssing..." or "[stat_ic_burst]".
Output only the echoText.`,
});

const generateInternalEchoFlow = ai.defineFlow(
  {
    name: 'generateInternalEchoFlow',
    inputSchema: GenerateInternalEchoInputSchema,
    outputSchema: GenerateInternalEchoOutputSchema,
  },
  async (input) => {
    const {output} = await internalEchoPrompt(input);
    if (output && output.echoText && output.echoText.length > 50) { // Max 10 words roughly 50 chars
        return { echoText: output.echoText.substring(0, 47) + "..." };
    }
    return output!;
  }
);

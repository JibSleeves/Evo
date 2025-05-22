
'use server';
/**
 * @fileOverview Generates an abstract visual representation (dream) based on text analysis.
 *
 * - generateDreamVisual - A function that creates a symbolic image.
 * - GenerateDreamVisualInput - Input type.
 * - GenerateDreamVisualOutput - Output type (Data URI of the image).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { UiVariant } from '@/types';

const AvailableUiVariantsSchema = z.enum(['default', 'pulsing_glow', 'minimal_glitch', 'intense_holographic', 'calm_focus']) satisfies z.ZodType<UiVariant>;

const GenerateDreamVisualInputSchema = z.object({
  analysisText: z.string().max(500).describe('The text analysis (e.g., interaction summary, key insights) to be visually represented in an abstract, symbolic way. Max 500 chars.'),
  currentUiVariant: AvailableUiVariantsSchema.describe('The current UI variant of the chatbot, to subtly influence the dream\'s aesthetic (e.g., glitchy, holographic).'),
  keyLearningsText: z.string().max(300).optional().describe('Concatenated key learnings or insights, if any, to further theme the dream. Max 300 chars.'),
});
export type GenerateDreamVisualInput = z.infer<typeof GenerateDreamVisualInputSchema>;

const GenerateDreamVisualOutputSchema = z.object({
  dreamDataUri: z.string().url().describe("A data URI of the generated abstract image. Expected format: 'data:image/png;base64,<encoded_data>'."),
});
export type GenerateDreamVisualOutput = z.infer<typeof GenerateDreamVisualOutputSchema>;

export async function generateDreamVisual(input: GenerateDreamVisualInput): Promise<GenerateDreamVisualOutput> {
  return generateDreamVisualFlow(input);
}

const generateDreamVisualFlow = ai.defineFlow(
  {
    name: 'generateDreamVisualFlow',
    inputSchema: GenerateDreamVisualInputSchema,
    outputSchema: GenerateDreamVisualOutputSchema,
  },
  async (input) => {
    let prompt = `Generate an abstract, symbolic, cyberpunk-themed visual. This visual is a "dream" or "thought-form."
It should represent the essence of the following analysis: "${input.analysisText.substring(0, 300)}..."
{{#if keyLearningsText}}Additional themes from key learnings: "{{keyLearningsText}}"{{/if}}

The current UI aesthetic is "{{currentUiVariant}}". Let this heavily inspire the dream's visual style:
- 'default': A balanced, slightly mechanical look.
- 'pulsing_glow': Luminous, with soft glows and energy pulses. Primary colors prominent.
- 'minimal_glitch': Geometric, sharp, with subtle digital artifacts or scan lines.
- 'intense_holographic': Ethereal, layered, translucent, with bright accent colors and a sense of depth.
- 'calm_focus': Serene, flowing patterns, cooler color palette, perhaps with a central focused element.

The image should be non-literal, focusing on mood, patterns, symbolic colors, and textures that align with the UI variant. Avoid text or recognizable objects.
Focus on themes of evolution, data, consciousness, digital introspection, and the specific insights from the analysis and key learnings.
Output a PNG image.`;

    try {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // MUST use this model for images
        prompt: prompt,
        config: {
          responseModalities: ['IMAGE'], // Request only IMAGE
           safetySettings: [ 
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
          ],
        },
      });

      if (media && media.url) {
        return { dreamDataUri: media.url };
      } else {
        console.error('Dream Weaving: No image media returned from model.');
        return { dreamDataUri: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' }; // Transparent pixel
      }
    } catch (error) {
      console.error("Error in generateDreamVisualFlow:", error);
      return { dreamDataUri: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' };
    }
  }
);

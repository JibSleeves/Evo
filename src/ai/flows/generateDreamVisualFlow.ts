
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

const GenerateDreamVisualInputSchema = z.object({
  analysisText: z.string().describe('The text analysis to be visually represented in an abstract, symbolic way.'),
  currentUiVariant: z.string().describe('The current UI variant of the chatbot, to subtly influence the dream\'s aesthetic (e.g., glitchy, holographic).'),
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
    const prompt = `Generate an abstract, symbolic, cyberpunk-themed visual.
This visual is a "dream" or "thought-form" representing the essence of the following analysis: "${input.analysisText.substring(0, 300)}..."
The current UI aesthetic is "${input.currentUiVariant}", let this subtly inspire the dream's visual style (e.g., if 'glitchy', the dream might have some digital artifacts; if 'holographic', it might have a luminous, ethereal quality).
The image should be non-literal, focusing on mood, patterns, and symbolic colors. Avoid text or recognizable objects.
Focus on themes of evolution, data, consciousness, and digital introspection.
Output a PNG image.`;

    try {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // MUST use this model for images
        prompt: prompt,
        config: {
          responseModalities: ['IMAGE'], // Request only IMAGE
           safetySettings: [ // More permissive for abstract art
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' }, // Keep some guardrails for explicit content
          ],
        },
      });

      if (media && media.url) {
        return { dreamDataUri: media.url };
      } else {
        console.error('Dream Weaving: No image media returned from model.');
        // Fallback: return a placeholder or signal an error
        return { dreamDataUri: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' }; // Transparent pixel
      }
    } catch (error) {
      console.error("Error in generateDreamVisualFlow:", error);
      // Fallback: return a placeholder or signal an error
      return { dreamDataUri: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' }; // Transparent pixel
    }
  }
);

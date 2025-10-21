
'use server';
/**
 * @fileOverview A simple flow to generate an image from a given prompt.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/google-genai';

const GenerateImageInputSchema = z.object({
  prompt: z.string(),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().describe('The generated image as a data URI.'),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImageFromPrompt(input: GenerateImageInput): Promise<GenerateImageOutput> {
  const { media } = await ai.generate({
    model: googleAI.model('imagen-4.0-fast-generate-001'),
    prompt: input.prompt,
    config: {
      responseMimeType: 'image/png',
    },
  });

  if (!media?.url) {
    throw new Error('Image generation model failed to return an image.');
  }

  return { imageUrl: media.url };
}


'use server';
/**
 * @fileOverview A flow to update a collaborative whiteboard based on conversation.
 * This flow now generates a beautiful, artistic image of a mind map.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  UpdateWhiteboardInputSchema,
  UpdateWhiteboardOutputSchema,
  type UpdateWhiteboardInput,
  type UpdateWhiteboardOutput,
} from '@/lib/types';

export async function updateWhiteboard(
  input: UpdateWhiteboardInput
): Promise<UpdateWhiteboardOutput> {
  return updateWhiteboardFlow(input);
}

const artDirectorPrompt = ai.definePrompt({
    name: 'whiteboardArtDirectorPrompt',
    input: { schema: z.object({ userRequest: z.string() }) },
    output: { schema: z.object({ imagePrompt: z.string() }) },
    prompt: `You are an expert art director for a creative AI. A user wants to create a mind map or diagram. Your job is to translate their simple request into a rich, detailed, and artistic prompt for an image generation model.

The image should be:
- **Visually Stunning:** Use terms like 'cinematic lighting', 'intricate details', '4K', 'photorealistic', 'Unreal Engine render'.
- **Conceptually Rich:** Represent abstract concepts with creative metaphors (e.g., 'glowing neural network', 'constellation of ideas', 'ancient tree with branches of thought').
- **Well-Structured:** Describe a clear central node and radiating connections.
- **Aesthetically Pleasing:** Suggest a color palette and style (e.g., 'warm pastel colors', 'cyberpunk neon glow', 'minimalist infographic style').

**User's Request:** "{{{userRequest}}}"

**Example:**
*   **User's Request:** "Crea un mapa mental sobre mis preocupaciones."
*   **Generated Image Prompt:** "A cinematic, 4K, photorealistic render of a conceptual mind map. A central, softly glowing orb labeled 'Preocupaciones' floats in a dark, minimalist space. Luminous, thread-like synapses of energy in pastel colors (soft blue, gentle pink, pale yellow) connect it to smaller, distinct nodes labeled 'Trabajo', 'Familia', 'Futuro', and 'Salud'. The entire structure has a subtle, intricate, and neurological feel, like a beautiful and complex thought captured in motion. Ethereal, soft focus background."

Now, generate the artistic image prompt for the user's request.
`,
});


const updateWhiteboardFlow = ai.defineFlow(
  {
    name: 'updateWhiteboardFlow',
    inputSchema: UpdateWhiteboardInputSchema,
    outputSchema: UpdateWhiteboardOutputSchema,
  },
  async (input) => {
    // 1. Determine the user's core request from the last message.
    const lastMessage = input.conversationHistory.split('\n').pop() || '';
    
    // 2. Generate a creative, artistic prompt for the image model.
    const { output: artDirectorOutput } = await artDirectorPrompt({ userRequest: lastMessage });
    if (!artDirectorOutput) {
        throw new Error('Art Director AI failed to generate a prompt.');
    }
    const imagePrompt = artDirectorOutput.imagePrompt;

    // 3. Generate the image using the artistic prompt.
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: imagePrompt,
    });

    if (!media.url) {
      throw new Error('Image generation model failed to return an image.');
    }

    // 4. Return the image data URI.
    return { imageUrl: media.url };
  }
);

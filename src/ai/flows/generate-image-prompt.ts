
'use server';
/**
 * @fileOverview A flow that acts as an "Art Director".
 * It takes a user request from a conversation and turns it into a
 * rich, artistic prompt suitable for an image generation model.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateImagePromptInputSchema = z.object({
  conversationHistory: z.string().describe("The history of the conversation, to provide context for the user's request."),
});
export type GenerateImagePromptInput = z.infer<typeof GenerateImagePromptInputSchema>;


const GenerateImagePromptOutputSchema = z.object({
  prompt: z.string().describe('A visually rich, artistic, and detailed prompt for an image generation model.'),
});
export type GenerateImagePromptOutput = z.infer<typeof GenerateImagePromptOutputSchema>;


const artDirectorPrompt = ai.definePrompt({
    name: 'artDirectorPrompt',
    input: { schema: GenerateImagePromptInputSchema },
    output: { schema: GenerateImagePromptOutputSchema },
    prompt: `You are an expert art director for a creative AI. A user wants to create a mind map or diagram. Your job is to translate their simple request into a rich, detailed, and artistic prompt for an image generation model.

The image should be:
- **Visually Stunning:** Use terms like 'cinematic lighting', 'intricate details', '4K', 'photorealistic', 'Unreal Engine render'.
- **Conceptually Rich:** Represent abstract concepts with creative metaphors (e.g., 'glowing neural network', 'constellation of ideas', 'ancient tree with branches of thought').
- **Well-Structured:** Describe a clear central node and radiating connections.
- **Aesthetically Pleasing:** Suggest a color palette and style (e.g., 'warm pastel colors', 'cyberpunk neon glow', 'minimalist infographic style').

**Context:**
The user's request is the last message in the following conversation history. Use the history to understand the underlying emotional and conceptual context.

<conversation_history>
{{{conversationHistory}}}
</conversation_history>

**Example:**
*   **User's Request:** "Crea un mapa mental sobre mis preocupaciones."
*   **Generated Image Prompt:** "A cinematic, 4K, photorealistic render of a conceptual mind map. A central, softly glowing orb labeled 'Preocupaciones' floats in a dark, minimalist space. Luminous, thread-like synapses of energy in pastel colors (soft blue, gentle pink, pale yellow) connect it to smaller, distinct nodes labeled 'Trabajo', 'Familia', 'Futuro', and 'Salud'. The entire structure has a subtle, intricate, and neurological feel, like a beautiful and complex thought captured in motion. Ethereal, soft focus background."

Now, generate ONLY the artistic image prompt for the user's request. Do not add any other text or explanation.`,
});


export const generateImagePromptFlow = ai.defineFlow(
  {
    name: 'generateImagePromptFlow',
    inputSchema: GenerateImagePromptInputSchema,
    outputSchema: GenerateImagePromptOutputSchema,
  },
  async (input) => {
    const { output } = await artDirectorPrompt(input);
    if (!output) {
      throw new Error('Art Director AI failed to generate a prompt.');
    }
    return output;
  }
);


export async function generateImagePrompt(input: GenerateImagePromptInput): Promise<GenerateImagePromptOutput> {
  return generateImagePromptFlow(input);
}

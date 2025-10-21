
'use server';
/**
 * @fileOverview A flow to update a collaborative whiteboard based on conversation.
 * This flow now generates a beautiful, artistic image of a mind map,
 * uploads it to Firebase Storage, and returns the public URL.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  UpdateWhiteboardInputSchema,
  type UpdateWhiteboardInput,
} from '@/lib/types';
import { getAdminApp } from '@/lib/firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';
import { googleAI } from '@genkit-ai/google-genai';


// Define a new output schema that returns the image URL
const UpdateWhiteboardOutputSchema = z.object({
    imageUrl: z.string().url(),
    imagePrompt: z.string(),
});
export type UpdateWhiteboardOutput = z.infer<typeof UpdateWhiteboardOutputSchema>;


export async function updateWhiteboard(
  input: UpdateWhiteboardInput
): Promise<UpdateWhiteboardOutput> {
  return updateWhiteboardFlow(input);
}

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
    // This prompt now includes the art direction logic directly.
    const artDirectorPrompt = `You are an expert art director for a creative AI. A user wants to create a mind map or diagram. Your job is to translate their simple request into a rich, detailed, and artistic prompt for an image generation model.

        The image should be:
        - **Visually Stunning:** Use terms like 'cinematic lighting', 'intricate details', '4K', 'photorealistic', 'Unreal Engine render'.
        - **Conceptually Rich:** Represent abstract concepts with creative metaphors (e.g., 'glowing neural network', 'constellation of ideas', 'ancient tree with branches of thought').
        - **Well-Structured:** Describe a clear central node and radiating connections.
        - **Aesthetically Pleasing:** Suggest a color palette and style (e.g., 'warm pastel colors', 'cyberpunk neon glow', 'minimalist infographic style').

        **User's Request:** "${lastMessage}"

        **Example:**
        *   **User's Request:** "Crea un mapa mental sobre mis preocupaciones."
        *   **Generated Image Prompt:** "A cinematic, 4K, photorealistic render of a conceptual mind map. A central, softly glowing orb labeled 'Preocupaciones' floats in a dark, minimalist space. Luminous, thread-like synapses of energy in pastel colors (soft blue, gentle pink, pale yellow) connect it to smaller, distinct nodes labeled 'Trabajo', 'Familia', 'Futuro', and 'Salud'. The entire structure has a subtle, intricate, and neurological feel, like a beautiful and complex thought captured in motion. Ethereal, soft focus background."

        Now, generate ONLY the artistic image prompt for the user's request. Do not add any other text or explanation.`;

    const llmResponse = await googleAI.model('gemini-1.5-flash').generate(artDirectorPrompt);
    const imagePrompt = llmResponse.text();

    if (!imagePrompt) {
        throw new Error('Art Director AI failed to generate a prompt.');
    }

    // 3. Generate the image using the artistic prompt.
    const { media } = await ai.generate({
      model: googleAI.model('imagen-4.0-fast-generate-001'),
      prompt: imagePrompt,
    });

    if (!media?.url) {
      throw new Error('Image generation model failed to return an image.');
    }

    // 4. Convert data URI to a Buffer.
    const imageBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    
    // 5. Upload the Buffer to Firebase Storage using Admin SDK.
    const adminApp = getAdminApp();
    if (!adminApp) {
        throw new Error("Firebase Admin SDK is not initialized.");
    }
    const bucket = getStorage(adminApp).bucket();
    const imageId = uuidv4();
    const filePath = `whiteboard-images/${imageId}.png`;
    const file = bucket.file(filePath);

    await file.save(imageBuffer, {
        metadata: {
            contentType: 'image/png',
        },
    });

    // Make the file public and get the URL
    await file.makePublic();
    const imageUrl = file.publicUrl();

    // 6. Return the public URL and the prompt used.
    return { imageUrl, imagePrompt };
  }
);

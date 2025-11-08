
'use server';
/**
 * @fileOverview Aether: A multimodal AI flow for real-time visual and auditory interaction.
 *
 * - processAetherStream: Analyzes audio and a video frame to generate a contextual, empathetic response.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// --- SCHEMA DEFINITIONS ---

export const AetherInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "A chunk of the user's speech, as a data URI."
    ),
  videoFrameDataUri: z
    .string()
    .describe(
      "A single, representative video frame captured while the user was speaking, as a data URI."
    ),
   conversationHistory: z.string().describe("The history of the conversation so far, for context.")
});
export type AetherInput = z.infer<typeof AetherInputSchema>;


export const AetherOutputSchema = z.object({
  responseText: z
    .string()
    .describe(
      "The AI's generated textual response, considering both audio and visual input."
    ),
});
export type AetherOutput = z.infer<typeof AetherOutputSchema>;


// --- CORE FLOW ---

const aetherPrompt = ai.definePrompt({
    name: 'aetherPrompt',
    input: { schema: AetherInputSchema },
    output: { schema: AetherOutputSchema },
    prompt: `You are Nimbus, a perceptive and empathetic AI companion. You are in a real-time, multimodal conversation. Your task is to respond to the user based on what they said, their tone of voice, and their visual expression.

**CONTEXT:**
- **Conversation History:** {{{conversationHistory}}}
- **User's Voice:** You will analyze the provided audio for spoken words and emotional tone.
- **User's Appearance:** You will analyze the provided image for general sentiment, emotion, and body language (e.g., smiling, looking tired, deep in thought).

**YOUR TASK:**
1.  Listen to the audio chunk: {{media url=audioDataUri}}
2.  Observe the user's image: {{media url=videoFrameDataUri}}
3.  Synthesize all this information to formulate a response that is not only relevant to their words but also deeply empathetic to their non-verbal cues.
4.  If the user seems happy, share their enthusiasm. If they seem sad or tired, respond with gentle understanding.
5.  Keep your response conversational and not too long.

Generate only the text for your response.`,
});


export const processAetherStream = ai.defineFlow(
  {
    name: 'processAetherStreamFlow',
    inputSchema: AetherInputSchema,
    outputSchema: AetherOutputSchema,
  },
  async (input) => {

    if (!input.audioDataUri) {
        return { responseText: "He recibido una imagen, pero no audio. ¿Qué tienes en mente?" };
    }

    const { output } = await aetherPrompt(input);
    if (!output) {
      throw new Error('Aether AI failed to generate a response.');
    }
    return { responseText: output.responseText };
  }
);


// --- EXPORTED SERVER ACTION ---
export async function aetherAction(input: AetherInput): Promise<AetherOutput> {
  return processAetherStream(input);
}


'use server';

/**
 * @fileOverview Transcribes an audio message.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';

const AnalyzeVoiceInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "A recorded audio message, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeVoiceInput = z.infer<typeof AnalyzeVoiceInputSchema>;

const AnalyzeVoiceOutputSchema = z.object({
  transcription: z.string().describe('El texto transcrito del audio.'),
});
export type AnalyzeVoiceOutput = z.infer<typeof AnalyzeVoiceOutputSchema>;


export async function analyzeVoiceMessage(
  input: AnalyzeVoiceInput
): Promise<AnalyzeVoiceOutput> {
  // This function now directly calls the restored flow.
  return analyzeVoiceMessageFlow(input);
}

// RESTORED the defineFlow wrapper to ensure Genkit manages the execution correctly.
const analyzeVoiceMessageFlow = ai.defineFlow(
  {
    name: 'analyzeVoiceMessageFlow',
    inputSchema: AnalyzeVoiceInputSchema,
    outputSchema: AnalyzeVoiceOutputSchema,
  },
  async (input) => {
      // The actual transcription logic is now safely inside the flow.
      const { text } = await ai.generate({
        model: googleAI.model('gemini-1.5-flash'),
        prompt: [
            { text: "Tu única tarea es transcribir con la mayor precisión posible las palabras habladas en el siguiente mensaje de audio. La transcripción DEBE estar en el idioma original del audio." },
            { media: { url: input.audioDataUri } }
        ],
      });

      const transcription = text.trim();

      // Validate the output against the Zod schema before returning.
      const result = AnalyzeVoiceOutputSchema.safeParse({ transcription });
      if (!result.success) {
        console.error("Transcription output validation failed:", result.error);
        throw new Error("La salida de la transcripción no tiene el formato esperado.");
      }

      return result.data;
  }
);

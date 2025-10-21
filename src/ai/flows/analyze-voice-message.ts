
'use server';

/**
 * @fileOverview Transcribes an audio message. The emotional tone analysis has been deprecated.
 */

import { ai } from '@/ai/genkit';
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
): Promise<z.infer<typeof AnalyzeVoiceOutputSchema>> {
  return analyzeVoiceMessageFlow(input);
}


const analyzeVoicePrompt = ai.definePrompt({
  name: 'analyzeVoiceMessagePrompt',
  input: { schema: AnalyzeVoiceInputSchema },
  output: { schema: AnalyzeVoiceOutputSchema },
  prompt: `Eres un experto transcriptor de audio. Tu única tarea es transcribir con la mayor precisión posible las palabras habladas en el siguiente mensaje de audio.

**IMPORTANTE**: La transcripción DEBE estar en español.

Mensaje de audio a analizar:
{{media url=audioDataUri}}
`,
});

const analyzeVoiceMessageFlow = ai.defineFlow(
  {
    name: 'analyzeVoiceMessageFlow',
    inputSchema: AnalyzeVoiceInputSchema,
    outputSchema: AnalyzeVoiceOutputSchema,
  },
  async (input) => {
    const { output } = await analyzeVoicePrompt(input);
    if (!output) {
      throw new Error('Could not transcribe voice message.');
    }
    return output;
  }
);

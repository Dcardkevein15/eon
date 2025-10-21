'use server';

/**
 * @fileOverview Transcribes an audio message and analyzes its emotional tone.
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
  transcription: z.string().describe('The transcribed text from the audio.'),
  inferredTone: z
    .string()
    .describe(
      'A brief (2-3 word) analysis of the emotional tone based on prosody (pitch, rhythm, volume). E.g., "Hesitant and soft", "Energetic and confident", "Monotone and tired".'
    ),
});
export type AnalyzeVoiceOutput = z.infer<typeof AnalyzeVoiceOutputSchema>;

export async function analyzeVoiceMessage(
  input: AnalyzeVoiceInput
): Promise<AnalyzeVoiceOutput> {
  return analyzeVoiceMessageFlow(input);
}


const analyzeVoicePrompt = ai.definePrompt({
  name: 'analyzeVoiceMessagePrompt',
  input: { schema: AnalyzeVoiceInputSchema },
  output: { schema: AnalyzeVoiceOutputSchema },
  prompt: `You are an expert voice and sentiment analyst. A user has provided an audio message. Your task is to:
1.  Transcribe the spoken words accurately.
2.  Analyze the prosody of the voice (pitch, rhythm, volume, pauses) to infer the underlying emotional tone. Do not analyze the words, only the sound of the voice.
3.  Provide a brief, 2-3 word description of this inferred tone.

Audio message to analyze:
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
      throw new Error('Could not analyze voice message.');
    }
    return output;
  }
);

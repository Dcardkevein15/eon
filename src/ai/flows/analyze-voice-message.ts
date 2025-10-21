
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
  transcription: z.string().describe('El texto transcrito del audio.'),
  inferredTone: z
    .string()
    .describe(
      'Un análisis breve (2-3 palabras) del tono emocional basado en la prosodia (tono, ritmo, volumen). Ej: "Dudoso y suave", "Enérgico y seguro", "Monótono y cansado".'
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
  prompt: `Eres un experto analista de voz y sentimientos. Un usuario ha proporcionado un mensaje de audio. Tu tarea es:
1.  Transcribir las palabras habladas con precisión.
2.  Analizar la prosodia de la voz (tono, ritmo, volumen, pausas) para inferir el tono emocional subyacente. No analices las palabras, solo el sonido de la voz.
3.  Proporcionar una breve descripción de 2-3 palabras de este tono inferido.

**IMPORTANTE**: Toda la salida (transcripción y análisis de tono) DEBE estar en español.

Ejemplo de salida para el tono: "Firme y directo", "Vacilante y suave".

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
      throw new Error('Could not analyze voice message.');
    }
    return output;
  }
);

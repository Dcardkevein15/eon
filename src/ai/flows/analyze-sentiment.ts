'use server';

/**
 * @fileOverview Analyzes the sentiment of a single sentence.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { AnalyzeSentimentInputSchema, AnalyzeSentimentOutputSchema, type AnalyzeSentimentInput, type AnalyzeSentimentOutput } from '@/lib/types';


export async function analyzeSentiment(input: AnalyzeSentimentInput): Promise<AnalyzeSentimentOutput> {
  return analyzeSentimentFlow(input);
}


const prompt = ai.definePrompt({
    name: 'analyzeSentimentPrompt',
    input: { schema: AnalyzeSentimentInputSchema },
    output: { schema: AnalyzeSentimentOutputSchema },
    prompt: `Analiza el sentimiento del siguiente texto y devuelve un único número de -1.0 (extremadamente negativo) a 1.0 (extremadamente positivo).

Texto: "{{{text}}}"

IMPORTANTE: Tu respuesta DEBE ser únicamente un objeto JSON con la clave "sentiment" y el valor numérico. Por ejemplo:
{
  "sentiment": 0.85
}
`,
});


const analyzeSentimentFlow = ai.defineFlow(
  {
    name: 'analyzeSentimentFlow',
    inputSchema: AnalyzeSentimentInputSchema,
    outputSchema: AnalyzeSentimentOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

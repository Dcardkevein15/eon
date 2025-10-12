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
    prompt: `Analiza el sentimiento de la siguiente frase y devuelve un único número de -1.0 (extremadamente negativo) a 1.0 (extremadamente positivo). La respuesta debe ser únicamente el número.

Frase: "{{{text}}}"
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

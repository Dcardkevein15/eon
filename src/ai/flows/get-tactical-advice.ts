'use server';

/**
 * @fileOverview Provides tactical advice for a user stuck in a simulation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { GetTacticalAdviceInputSchema, GetTacticalAdviceOutputSchema, type GetTacticalAdviceInput, type GetTacticalAdviceOutput } from '@/lib/types';


export async function getTacticalAdvice(input: GetTacticalAdviceInput): Promise<GetTacticalAdviceOutput> {
  return getTacticalAdviceFlow(input);
}


const prompt = ai.definePrompt({
    name: 'getTacticalAdvicePrompt',
    input: { schema: GetTacticalAdviceInputSchema },
    output: { schema: GetTacticalAdviceOutputSchema },
    prompt: `Eres un coach de comunicación asertiva. El usuario está atascado en una simulación de role-playing y necesita ayuda.

**Objetivo del Escenario:**
{{scenarioTitle}}

**Historial de la Conversación:**
{{conversationHistory}}

Basado en el objetivo y el historial, proporciona 3 sugerencias cortas, accionables y tácticas sobre cómo el usuario podría responder AHORA. Las sugerencias deben ser diversas (ej. una pregunta, una declaración en primera persona, una propuesta).

Formato de salida: Un array de 3 strings.
`,
});


const getTacticalAdviceFlow = ai.defineFlow(
  {
    name: 'getTacticalAdviceFlow',
    inputSchema: GetTacticalAdviceInputSchema,
    outputSchema: GetTacticalAdviceOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

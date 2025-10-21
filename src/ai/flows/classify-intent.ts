
'use server';

/**
 * @fileOverview Classifies the communication tactic of a single sentence.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { ClassifyIntentInputSchema, ClassifyIntentOutputSchema, type ClassifyIntentInput, type ClassifyIntentOutput } from '@/lib/types';


export async function classifyIntent(input: ClassifyIntentInput): Promise<ClassifyIntentOutput> {
  return classifyIntentFlow(input);
}


const prompt = ai.definePrompt({
    name: 'classifyIntentPrompt',
    input: { schema: ClassifyIntentInputSchema },
    output: { schema: ClassifyIntentOutputSchema },
    prompt: `Eres un psicólogo experto en análisis de la comunicación. Clasifica la táctica de comunicación principal utilizada en la siguiente frase del usuario en 1-3 palabras.

Ejemplos de clasificación:
- "Siento que mis esfuerzos no están siendo valorados." -> "Declaración en Primera Persona"
- "Nunca me escuchas cuando te hablo." -> "Generalización Exagerada"
- "Si de verdad te importara, lo harías." -> "Manipulación Emocional"
- "¿Podríamos buscar un momento para hablar de mis responsabilidades?" -> "Propuesta de Diálogo"
- "Está bien, como quieras." (dicho con sarcasmo) -> "Acuerdo Pasivo-Agresivo"
- "Necesito que respetes mi decisión de no ir." -> "Establecimiento de Límite"
- "¿Por qué siempre tienes que criticarme?" -> "Actitud Defensiva / Contraataque"

Frase a analizar: "{{{text}}}"
`,
});


const classifyIntentFlow = ai.defineFlow(
  {
    name: 'classifyIntentFlow',
    inputSchema: ClassifyIntentInputSchema,
    outputSchema: ClassifyIntentOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

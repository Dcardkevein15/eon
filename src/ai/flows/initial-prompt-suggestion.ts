'use server';

/**
 * @fileOverview A flow that suggests initial prompts to new users.
 *
 * - getInitialPrompts - A function that returns a list of suggested prompts.
 * - InitialPromptsOutput - The return type for the getInitialPrompts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InitialPromptsOutputSchema = z.object({
  prompts: z.array(z.string()).describe('Una lista de sugerencias de prompts para que el usuario pueda empezar.'),
});

export type InitialPromptsOutput = z.infer<typeof InitialPromptsOutputSchema>;

export async function getInitialPrompts(): Promise<InitialPromptsOutput> {
  return initialPromptSuggestionFlow();
}

const initialPromptSuggestionFlow = ai.defineFlow(
  {
    name: 'initialPromptSuggestionFlow',
    outputSchema: InitialPromptsOutputSchema,
  },
  async () => {
    const {output} = await initialPromptSuggestionPrompt();
    return output!;
  }
);

const initialPromptSuggestionPrompt = ai.definePrompt({
  name: 'initialPromptSuggestionPrompt',
  output: {schema: InitialPromptsOutputSchema},
  prompt: `Eres un asistente de IA útil. Genera una lista de prompts diversos y atractivos que los nuevos usuarios pueden usar para explorar las capacidades de esta aplicación de chat de IA.

Concéntrate en sugerir prompts que muestren una variedad de características y casos de uso, como escritura creativa, resolución de problemas, recuperación de información y conversación general. Los prompts deben ser claros, concisos y fáciles de entender.

Devuelve los prompts como un array JSON de strings.

Ejemplo:
{
  "prompts": [
    "Escribe un poema corto sobre el océano.",
    "Resume la trama de Hamlet.",
    "¿Cuáles son los beneficios de la meditación?",
    "Cuéntame un chiste.",
    "Compón un haiku sobre las hojas de otoño",
    "Explica la teoría de la relatividad en términos simples",
    "Dame cinco ideas diferentes para desayunos saludables",
    "Escribe una historia de ficción sobre un viajero en el tiempo",
    "Traduce 'Hola, ¿cómo estás?' al inglés",
    "Enumera los elementos químicos de la tabla periódica"
  ]
}

Asegúrate de que el array tenga al menos 5 sugerencias.
`,
});

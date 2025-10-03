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
  prompt: `Eres un asistente de IA útil. Genera una lista de prompts diversos y atractivos que los nuevos usuarios pueden usar para empezar a conversar con ¡tu-psicologo-ya!.

Concéntrate en sugerir prompts que inviten a la reflexión y al desahogo emocional. Los prompts deben ser claros, concisos y fáciles de entender.

Devuelve los prompts como un array JSON de strings.

Ejemplo:
{
  "prompts": [
    "Últimamente me he sentido muy estresado, ¿qué puedo hacer?",
    "¿Cómo puedo manejar la ansiedad en el trabajo?",
    "No me siento motivado, ¿algún consejo?",
    "Quiero mejorar mis hábitos de sueño.",
    "Escribe una historia de ficción sobre un viajero en el tiempo",
    "¿Cuáles son los beneficios de la meditación?",
    "He tenido un mal día, necesito desahogarme."
  ]
}

Asegúrate de que el array tenga al menos 5 sugerencias.
`,
});

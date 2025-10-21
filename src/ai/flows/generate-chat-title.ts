'use server';

/**
 * @fileOverview Generates a short, descriptive title for a chat based on its initial messages.
 *
 * - generateChatTitle - A function that creates a title.
 * - GenerateChatTitleInput - The input type for the generateChatTitle function.
 * - GenerateChatTitleOutput - The return type for the generateChatTitle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateChatTitleInputSchema = z.object({
  conversationHistory: z
    .string()
    .describe('El primer mensaje del usuario y la primera respuesta del asistente.'),
});
export type GenerateChatTitleInput = z.infer<
  typeof GenerateChatTitleInputSchema
>;

const GenerateChatTitleOutputSchema = z.object({
  title: z
    .string()
    .describe('Un título corto y descriptivo para el chat (2-5 palabras).'),
});
export type GenerateChatTitleOutput = z.infer<
  typeof GenerateChatTitleOutputSchema
>;

export async function generateChatTitle(
  input: GenerateChatTitleInput
): Promise<GenerateChatTitleOutput> {
  return generateChatTitleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateChatTitlePrompt',
  input: {schema: GenerateChatTitleInputSchema},
  output: {schema: GenerateChatTitleOutputSchema},
  prompt: `Basado en el siguiente extracto de conversación, crea un título corto y descriptivo de 2 a 5 palabras en español. El título debe capturar el tema principal de la conversación.

Conversación:
{{{conversationHistory}}}

Ejemplo:
Conversación:
Usuario: Últimamente me he sentido muy estresado en el trabajo.
Asistente: Lamento oír eso. ¿Puedes contarme más sobre lo que ha estado causando el estrés?

Título:
{
  "title": "Estrés en el Trabajo"
}
`,
});

const generateChatTitleFlow = ai.defineFlow(
  {
    name: 'generateChatTitleFlow',
    inputSchema: GenerateChatTitleInputSchema,
    outputSchema: GenerateChatTitleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

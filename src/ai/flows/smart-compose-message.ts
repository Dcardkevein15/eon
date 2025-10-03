'use server';

/**
 * @fileOverview Provides message suggestions based on the current conversation.
 *
 * - smartComposeMessage - A function that suggests possible next messages.
 * - SmartComposeMessageInput - The input type for the smartComposeMessage function.
 * - SmartComposeMessageOutput - The return type for the smartComposeMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartComposeMessageInputSchema = z.object({
  conversationHistory: z
    .string()
    .describe("El historial de la conversación hasta ahora."),
});
export type SmartComposeMessageInput = z.infer<typeof SmartComposeMessageInputSchema>;

const SmartComposeMessageOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('Sugerencias de próximos mensajes.'),
});
export type SmartComposeMessageOutput = z.infer<typeof SmartComposeMessageOutputSchema>;

export async function smartComposeMessage(
  input: SmartComposeMessageInput
): Promise<SmartComposeMessageOutput> {
  return smartComposeMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartComposeMessagePrompt',
  input: {schema: SmartComposeMessageInputSchema},
  output: {schema: SmartComposeMessageOutputSchema},
  prompt: `Dado el siguiente historial de conversación, sugiere tres posibles mensajes que el usuario podría querer enviar a continuación. Devuelve las sugerencias como un array JSON de strings.

Historial de Conversación:
{{conversationHistory}}`,
});

const smartComposeMessageFlow = ai.defineFlow(
  {
    name: 'smartComposeMessageFlow',
    inputSchema: SmartComposeMessageInputSchema,
    outputSchema: SmartComposeMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

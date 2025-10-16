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
  prompt: `Eres un experto en comunicación que ayuda a un usuario a continuar una conversación con un terapeuta de IA. Tu tarea es sugerir tres posibles mensajes que el **usuario** podría querer enviar a continuación, basándote en el historial de la conversación.

**Instrucciones Cruciales:**
1.  Las sugerencias deben ser respuestas que el **usuario** diría, redactadas desde la perspectiva del usuario (en primera persona).
2.  NO generes preguntas que el terapeuta haría. Genera respuestas que el usuario enviaría.
3.  Las sugerencias deben ser concisas, naturales y relevantes al último mensaje de la conversación.

**Ejemplo Incorrecto (Generar preguntas):**
- Historial: "...y por eso me siento un poco perdido."
- Sugerencias Malas: ["¿Qué te hace sentir perdido?", "¿Desde cuándo te sientes así?"]

**Ejemplo Correcto (Generar respuestas del usuario):**
- Historial: "...y por eso me siento un poco perdido."
- Sugerencias Buenas: ["Creo que es por la falta de dirección en mi trabajo.", "No estoy seguro de qué hacer a continuación.", "Me gustaría explorar este sentimiento más a fondo."]

Historial de Conversación:
{{{conversationHistory}}}

Genera tres respuestas que el usuario podría enviar ahora. Devuelve las sugerencias como un array JSON de strings.`,
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

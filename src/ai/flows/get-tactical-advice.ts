'use server';

/**
 * @fileOverview Provides tactical response suggestions for a simulation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GetTacticalAdviceInputSchema = z.object({
  scenarioTitle: z.string().describe('The title of the simulation scenario.'),
  personaPrompt: z.string().describe('The system prompt defining the AI persona.'),
  conversationHistory: z.string().describe("The history of the simulation conversation so far."),
});
export type GetTacticalAdviceInput = z.infer<typeof GetTacticalAdviceInputSchema>;

const GetTacticalAdviceOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('Three distinct, actionable response suggestions for the user.'),
});
export type GetTacticalAdviceOutput = z.infer<typeof GetTacticalAdviceOutputSchema>;

export async function getTacticalAdvice(
  input: GetTacticalAdviceInput
): Promise<GetTacticalAdviceOutput> {
  return getTacticalAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getTacticalAdvicePrompt',
  input: { schema: GetTacticalAdviceInputSchema },
  output: { schema: GetTacticalAdviceOutputSchema },
  prompt: `Eres un coach de comunicación experto. El usuario está en una simulación de role-playing. Tu tarea es darle tres sugerencias de respuesta, cortas, directas y altamente relevantes, para que pueda continuar la conversación de manera efectiva.

Las sugerencias deben ser:
-   **Frases completas y listas para usar**: El usuario debe poder hacer clic y enviar.
-   **Variadas**: Ofrece diferentes tácticas de comunicación (ej. una pregunta, una declaración de sentimiento, una propuesta).
-   **En primera persona**: Redactadas desde la perspectiva del usuario.

**Contexto de la Simulación:**
-   **Objetivo del Usuario:** {{{scenarioTitle}}}
-   **Personalidad del Personaje IA:** {{{personaPrompt}}}

**Historial de la Conversación:**
{{{conversationHistory}}}

Basándote en el último mensaje del personaje, genera tres posibles respuestas para el usuario.
`,
});

const getTacticalAdviceFlow = ai.defineFlow(
  {
    name: 'getTacticalAdviceFlow',
    inputSchema: GetTacticalAdviceInputSchema,
    outputSchema: GetTacticalAdviceOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);

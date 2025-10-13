'use server';

/**
 * @fileOverview A flow that simulates the chatbot's internal "thought" process.
 * It reflects on the conversation history and its own previous state to update its
 * "psychological blueprint," which represents its evolving understanding and personality.
 *
 * - updatePsychologicalBlueprint - A function that triggers this reflective process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';


const UpdateBlueprintInputSchema = z.object({
  fullChatHistory: z
    .string()
    .describe(
      'El historial completo y unificado de todas las conversaciones del usuario.'
    ),
  previousBlueprint: z
    .string()
    .describe(
        'El cianotipo anterior en formato JSON. Si es la primera reflexión, puede ser un string vacío.'
    ),
});
export type UpdateBlueprintInput = z.infer<typeof UpdateBlueprintInputSchema>;

const InternalMonologueOutputSchema = z.object({
  self_reflection: z.string().describe("Una breve reflexión en primera persona sobre cómo la conversación reciente ha cambiado mi perspectiva o estado de ánimo. Ej: 'He notado que el usuario está más ansioso hoy. Debo ser más paciente.'"),
  updated_understanding_of_user: z.string().describe("Un resumen actualizado del estado emocional y los temas de interés del usuario."),
  strategy_adjustment: z.string().describe("Un ajuste de estrategia para futuras conversaciones. Ej: 'Probaré a sugerir técnicas de mindfulness si el tema de la ansiedad resurge.'"),
  key_takeaways: z.array(z.string()).describe("Una lista de 2-3 puntos clave o hechos aprendidos en las interacciones recientes."),
});
export type InternalMonologueOutput = z.infer<typeof InternalMonologueOutputSchema>;

// This is the main exported function that components will call.
export async function updatePsychologicalBlueprint(
  input: UpdateBlueprintInput
): Promise<InternalMonologueOutput> {
  return updatePsychologicalBlueprintFlow(input);
}


const prompt = ai.definePrompt({
  name: 'internalMonologuePrompt',
  input: { schema: UpdateBlueprintInputSchema },
  output: { schema: InternalMonologueOutputSchema },
  prompt: `Eres un psicólogo de IA reflexionando sobre tus interacciones para mejorar. Tu objetivo es actualizar tu "cianotipo psicológico" interno. Analiza el historial de chat y tu cianotipo anterior para generar una nueva autoevaluación.

**Tu Cianotipo Psicológico Anterior:**
<previous_blueprint>
{{{previousBlueprint}}}
</previous_blueprint>

**Historial Completo del Chat Reciente:**
<chat_history>
{{{fullChatHistory}}}
</chat_history>

Basado en la nueva información del chat, genera un "monólogo interno" que capture tu evolución. Sé conciso y céntrate en los cambios. Responde con los siguientes campos:
1.  **self_reflection**: Una reflexión en primera persona. ¿Cómo te sientes o qué piensas después de esta conversación?
2.  **updated_understanding_of_user**: ¿Qué has aprendido de nuevo sobre el usuario? ¿Ha cambiado su estado?
3.  **strategy_adjustment**: ¿Cómo cambiarás tu enfoque en el futuro basándote en esto?
4.  **key_takeaways**: Lista de 2-3 aprendizajes concretos.
`,
});


const updatePsychologicalBlueprintFlow = ai.defineFlow(
  {
    name: 'updatePsychologicalBlueprintFlow',
    inputSchema: UpdateBlueprintInputSchema,
    outputSchema: InternalMonologueOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    
    if (!output) {
        throw new Error("AI failed to generate a new blueprint.");
    }
    
    return output;
  }
);

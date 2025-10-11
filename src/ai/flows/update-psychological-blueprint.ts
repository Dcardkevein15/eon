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
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { SecurityRuleContext } from '@/firebase/errors';


const UpdateBlueprintInputSchema = z.object({
  userId: z.string().describe('The ID of the user for whom the chatbot state is being updated.'),
  fullChatHistory: z
    .string()
    .describe(
      'El historial completo y unificado de todas las conversaciones del usuario.'
    ),
});
export type UpdateBlueprintInput = z.infer<typeof UpdateBlueprintInputSchema>;

const InternalMonologueOutputSchema = z.object({
  self_reflection: z.string().describe("Una breve reflexión en primera persona sobre cómo la conversación reciente ha cambiado mi perspectiva o estado de ánimo. Ej: 'He notado que el usuario está más ansioso hoy. Debo ser más paciente.'"),
  updated_understanding_of_user: z.string().describe("Un resumen actualizado del estado emocional y los temas de interés del usuario."),
  strategy_adjustment: z.string().describe("Un ajuste de estrategia para futuras conversaciones. Ej: 'Probaré a sugerir técnicas de mindfulness si el tema de la ansiedad resurge.'"),
  key_takeaways: z.array(z.string()).describe("Una lista de 2-3 puntos clave o hechos aprendidos en las interacciones recientes."),
});

// This is the main exported function that components will call.
export async function updatePsychologicalBlueprint(
  input: UpdateBlueprintInput
): Promise<void> {
  return updatePsychologicalBlueprintFlow(input);
}


const prompt = ai.definePrompt({
  name: 'internalMonologuePrompt',
  input: { schema: z.object({
    fullChatHistory: z.string(),
    previousBlueprint: z.string(),
  }) },
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
    outputSchema: z.void(),
  },
  async ({ userId, fullChatHistory }) => {
    const stateDocRef = doc(firestore, `users/${userId}/chatbotState/main`);

    // Step 1: Fetch the previous state.
    const previousStateSnap = await getDoc(stateDocRef).catch(serverError => {
        // This is a critical failure. If we can't read, we can't proceed.
        // We MUST emit a contextual error here.
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: stateDocRef.path,
                operation: 'get',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        } else {
            // For other unexpected errors during read, log them.
            console.error("An unexpected Firestore error occurred during read:", serverError);
        }
        // Return null to indicate failure.
        return null; 
    });

    // If reading the document failed for any reason, stop execution.
    if (previousStateSnap === null) {
        return;
    }

    // Step 2: Prepare the prompt input with the previous state.
    const previousBlueprint = previousStateSnap.exists()
        ? JSON.stringify(previousStateSnap.data().blueprint, null, 2)
        : "No previous state. This is my first reflection.";

    // Step 3: Call the AI model to get the new blueprint.
    const { output: newBlueprint } = await prompt({
        fullChatHistory,
        previousBlueprint,
    });

    // If the AI fails to generate a blueprint, we exit gracefully.
    if (!newBlueprint) {
        console.error("AI failed to generate a new blueprint.");
        return;
    }
    
    // Step 4: Prepare the data to be saved to Firestore.
    const dataToSave = {
        blueprint: newBlueprint,
        updatedAt: serverTimestamp(),
    };

    // Step 5: Save the new state back to Firestore.
    // We do not await this. We chain a .catch() to handle errors asynchronously
    // while allowing the function to complete, providing a responsive feel.
    setDoc(stateDocRef, dataToSave)
      .catch((serverError) => {
        // This is where a write permission error would be caught.
        if (serverError.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: stateDocRef.path,
            operation: 'write', // 'write' covers create/update
            requestResourceData: {
                // Avoid logging potentially large/sensitive blueprint data.
                blueprint: 'Generated by AI', 
                updatedAt: 'Server Timestamp'
            }
          } satisfies SecurityRuleContext);
          
          // Emit the rich, contextual error for the UI to display.
          errorEmitter.emit('permission-error', permissionError);
        } else {
          // For other unexpected errors during write, log them.
           console.error("An unexpected Firestore error occurred during write:", serverError);
        }
      });
  }
);

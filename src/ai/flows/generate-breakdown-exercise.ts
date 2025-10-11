'use server';

/**
 * @fileOverview Generates a personalized breakdown exercise for a user's habit loop.
 *
 * - generateBreakdownExercise - A function that creates the exercise.
 */

import { ai } from '@/ai/genkit';
import { GenerateBreakdownExerciseInputSchema, GenerateBreakdownExerciseOutputSchema, type GenerateBreakdownExerciseInput, type GenerateBreakdownExerciseOutput } from '@/lib/types';


export async function generateBreakdownExercise(
  input: GenerateBreakdownExerciseInput
): Promise<GenerateBreakdownExerciseOutput> {
  return generateBreakdownExerciseFlow(input);
}


const prompt = ai.definePrompt({
    name: 'generateBreakdownExercisePrompt',
    input: { schema: GenerateBreakdownExerciseInputSchema },
    output: { schema: GenerateBreakdownExerciseOutputSchema },
    prompt: `Eres un terapeuta experto en terapia cognitivo-conductual (TCC) y mindfulness. Tu tarea es crear un ejercicio de "ruptura de bucle" conciso, práctico y empático para un usuario, basado en el bucle de hábito que se ha identificado.

El ejercicio debe estar diseñado para que el usuario pueda realizarlo a través del journaling (escritura reflexiva). El objetivo no es "solucionar" el problema, sino aumentar la autoconciencia e introducir una pausa para la reflexión entre el disparador y la acción, fomentando la aceptación y la posibilidad de una nueva elección.

Usa un tono cálido, alentador y profesional. La salida debe estar en español y en formato Markdown.

Aquí está el bucle del hábito del usuario:
- **Disparador:** {{{habitLoop.trigger}}}
- **Pensamiento (Sesgo):** {{{habitLoop.thought}}}
- **Acción (Defensa):** {{{habitLoop.action}}}
- **Resultado:** {{{habitLoop.result}}}

Genera el siguiente contenido:

1.  **title**: Un título para el ejercicio. Debe ser corto y motivador. Ej: "Pausa Consciente: Re-escribiendo tu Guion".
2.  **introduction**: Un párrafo breve que introduce el ejercicio, validando la experiencia del usuario y explicando el propósito (aumentar la conciencia, no la auto-crítica).
3.  **exerciseSteps**: Una lista numerada de 3 a 5 pasos prácticos. Cada paso debe ser un prompt de journaling claro. Enfócate en:
    -   Identificar el disparador en el momento.
    -   Cuestionar la validez del pensamiento automático (el sesgo).
    -   Explorar acciones alternativas (incluso si solo se imaginan).
    -   Visualizar un resultado diferente y más saludable.
4.  **finalThought**: Un párrafo corto de cierre que refuerce la idea de que este es un proceso y que cada intento es un paso valioso.

Asegúrate de que todo el contenido generado sea práctico y esté directamente relacionado con el bucle de hábito específico del usuario.
`,
});


const generateBreakdownExerciseFlow = ai.defineFlow(
  {
    name: 'generateBreakdownExerciseFlow',
    inputSchema: GenerateBreakdownExerciseInputSchema,
    outputSchema: GenerateBreakdownExerciseOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

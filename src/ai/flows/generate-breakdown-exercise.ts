'use server';

/**
 * @fileOverview Generates a personalized breakdown exercise for a user's habit loop.
 *
 * - generateBreakdownExercise - A function that creates the exercise.
 * - GenerateBreakdownExerciseInput - The input type for the function.
 * - GenerateBreakdownExerciseOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const HabitLoopSchema = z.object({
  trigger: z.string().describe('El disparador o situación recurrente que activa el patrón de comportamiento problemático.'),
  thought: z.string().describe('El pensamiento automático (sesgo cognitivo) que aparece inmediatamente después del disparador.'),
  action: z.string().describe('La acción o respuesta conductual (mecanismo de defensa) que se ejecuta como resultado del pensamiento.'),
  result: z.string().describe('La consecuencia a corto y largo plazo de este bucle, explicando cómo refuerza el problema.'),
});

export const GenerateBreakdownExerciseInputSchema = z.object({
  habitLoop: HabitLoopSchema,
});
export type GenerateBreakdownExerciseInput = z.infer<typeof GenerateBreakdownExerciseInputSchema>;

const GenerateBreakdownExerciseOutputSchema = z.object({
  title: z.string().describe('Un título inspirador y relevante para el ejercicio.'),
  introduction: z.string().describe('Un párrafo introductorio corto, empático y que explica el propósito del ejercicio en formato Markdown.'),
  exerciseSteps: z.string().describe('Una guía paso a paso con 3-5 prompts de journaling o ejercicios de reflexión. Debe estar en formato Markdown, usando listas numeradas.'),
  finalThought: z.string().describe('Un párrafo final de ánimo y refuerzo positivo en formato Markdown.'),
});
export type GenerateBreakdownExerciseOutput = z.infer<typeof GenerateBreakdownExerciseOutputSchema>;


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

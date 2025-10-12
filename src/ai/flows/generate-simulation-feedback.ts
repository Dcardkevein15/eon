'use server';

/**
 * @fileOverview Analyzes a simulation transcript and provides constructive feedback.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateFeedbackInputSchema = z.object({
  scenarioTitle: z.string().describe('The title of the simulation scenario.'),
  scenarioDescription: z.string().describe('The description of what the user was trying to achieve.'),
  simulationTranscript: z.string().describe('The full transcript of the role-playing conversation.'),
});
export type GenerateFeedbackInput = z.infer<typeof GenerateFeedbackInputSchema>;

const GenerateFeedbackOutputSchema = z.object({
  feedback: z.string().describe('Detailed, constructive feedback for the user in Markdown format. It should include strengths, areas for improvement, and specific alternative phrases.'),
});
export type GenerateFeedbackOutput = z.infer<typeof GenerateFeedbackOutputSchema>;


export async function generateSimulationFeedback(input: GenerateFeedbackInput): Promise<GenerateFeedbackOutput> {
  return generateFeedbackFlow(input);
}


const prompt = ai.definePrompt({
    name: 'generateSimulationFeedbackPrompt',
    input: { schema: GenerateFeedbackInputSchema },
    output: { schema: GenerateFeedbackOutputSchema },
    prompt: `Eres un coach experto en comunicación y habilidades sociales. Tu tarea es analizar la transcripción de una simulación de role-playing y proporcionar un feedback constructivo, empático y accionable.

El objetivo del usuario era:
- **Título del Escenario:** {{{scenarioTitle}}}
- **Descripción:** {{{scenarioDescription}}}

Aquí está la transcripción completa de la simulación:
<transcripcion>
{{{simulationTranscript}}}
</transcripcion>

Analiza la transcripción y genera un feedback en formato Markdown que incluya los siguientes puntos:

1.  **Puntos Fuertes:** Empieza por lo positivo. Identifica 1 o 2 cosas que el usuario hizo bien. (Ej: "Lograste mantener la calma", "Expresaste tu punto de vista claramente en este momento...").

2.  **Áreas de Mejora:** Identifica 1 o 2 momentos clave donde la comunicación podría haber sido más efectiva. Sé específico y cita partes de la conversación si es posible.

3.  **Sugerencias y Frases Alternativas:** Para cada área de mejora, ofrece sugerencias concretas y ejemplos de frases que el usuario podría haber utilizado. (Ej: "En lugar de decir 'Nunca me escuchas', podrías haber intentado con 'Siento que mi punto de vista no fue considerado cuando...'").

4.  **Conclusión General:** Termina con un resumen alentador, reforzando la idea de que la práctica es clave y reconociendo el esfuerzo del usuario.

Usa un tono de apoyo y coaching, no de crítica. El objetivo es empoderar al usuario para que se sienta más seguro en la próxima conversación real.
`,
});


const generateFeedbackFlow = ai.defineFlow(
  {
    name: 'generateFeedbackFlow',
    inputSchema: GenerateFeedbackInputSchema,
    outputSchema: GenerateFeedbackOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

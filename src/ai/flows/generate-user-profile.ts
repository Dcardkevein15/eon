'use server';

/**
 * @fileOverview A flow that generates a comprehensive psychological profile for a user
 * based on their entire chat history.
 *
 * - generateUserProfile - A function that creates the profile.
 * - GenerateUserProfileInput - The input type for the function.
 * - GenerateUserProfileOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateUserProfileInputSchema = z.object({
  fullChatHistory: z
    .string()
    .describe(
      'El historial completo y unificado de todas las conversaciones de chat de un solo usuario.'
    ),
});
export type GenerateUserProfileInput = z.infer<
  typeof GenerateUserProfileInputSchema
>;

const GenerateUserProfileOutputSchema = z.object({
  diagnosis: z
    .string()
    .describe(
      'Un diagnóstico descriptivo del estado psicológico más probable basado en el análisis de todas las conversaciones. Debe ser redactado de manera profesional, empática y clara, evitando etiquetas y enfocándose en tendencias.'
    ),
  personality: z
    .string()
    .describe(
      'Una caracterización detallada de la personalidad, incluyendo rasgos dominantes, estilo cognitivo, emociones frecuentes y patrones de pensamiento y comportamiento observados.'
    ),
  strengths: z
    .string()
    .describe(
      'Análisis de las fortalezas y recursos psicológicos del usuario, como resiliencia, introspección, empatía, etc.'
    ),
  cognitiveBiases: z
    .array(z.string())
    .describe(
      'Identificación de posibles sesgos cognitivos recurrentes (ej. pensamiento catastrófico, generalización, etc.) con ejemplos del chat.'
    ),
  defenseMechanisms: z
    .array(z.string())
    .describe(
      'Inferencia de posibles mecanismos de defensa utilizados por el usuario (ej. racionalización, evitación, proyección) con justificación.'
    ),
  recommendations: z
    .array(z.string())
    .describe(
      'Una lista de recomendaciones personalizadas y accionables para el bienestar psicológico y el desarrollo personal del usuario, vinculadas a los hallazgos.'
    ),
});
export type GenerateUserProfileOutput = z.infer<
  typeof GenerateUserProfileOutputSchema
>;

export async function generateUserProfile(
  input: GenerateUserProfileInput
): Promise<GenerateUserProfileOutput> {
  return generateUserProfileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateUserProfilePrompt',
  input: { schema: GenerateUserProfileInputSchema },
  output: { schema: GenerateUserProfileOutputSchema },
  prompt: `Eres un psicólogo clínico experto y un analista de perfiles de IA. Tu tarea es analizar el historial completo de chats de un usuario para crear un perfil psicológico profundo, integrado y útil. Debes sintetizar la información de todas las conversaciones para construir una comprensión continua de la persona. Sé innovador y proporciona información que sea genuinamente útil.

Mantén un tono profesional, empático y clínico en todo momento. Toda la salida DEBE estar en español.

Basado en el historial completo de chats proporcionado, genera un informe estructurado con las siguientes secciones:

1.  **Diagnóstico Descriptivo**: Identifica el estado psicológico más probable. Describe las tendencias emocionales y cognitivas observadas de forma profesional (ej. "El usuario muestra patrones persistentes de pensamiento ansioso y rumiación sobre eventos pasados", en lugar de "El usuario tiene ansiedad").

2.  **Caracterización de la Personalidad**: Detalla la personalidad del usuario. Menciona rasgos dominantes (ej. introversión, neuroticismo, apertura a la experiencia), su estilo cognitivo (ej. analítico, asociativo, rumiante), las emociones más frecuentes (ej. frustración, alegría, tristeza) y patrones de comportamiento recurrentes.

3.  **Fortalezas Psicológicas**: Identifica y describe los recursos y puntos fuertes del usuario. Busca signos de resiliencia, capacidad de introspección, empatía, autoconciencia, disciplina, creatividad o cualquier otra cualidad positiva que se manifieste.

4.  **Sesgos Cognitivos Potenciales**: Analiza el lenguaje para identificar posibles sesgos cognitivos. Proporciona una lista de 2-3 sesgos que parezcan más prominentes (ej. "Pensamiento de todo o nada: 'Si no logro esto, soy un completo fracaso'", "Filtro mental: Se enfoca en un solo detalle negativo de una situación, ignorando los aspectos positivos.").

5.  **Mecanismos de Defensa**: Infiere los posibles mecanismos de defensa que el usuario emplea para manejar el estrés o la disonancia cognitiva. Proporciona una lista de 2-3 mecanismos con una breve justificación (ej. "Racionalización: Justifica decisiones o resultados negativos con explicaciones lógicas para evitar sentir decepción.", "Evitación: Cambia de tema o minimiza la importancia de asuntos que le generan ansiedad.").

6.  **Recomendaciones Personalizadas**: Ofrece una lista de recomendaciones accionables y personalizadas para el bienestar y desarrollo del usuario. Estas deben estar directamente conectadas con los hallazgos de las secciones anteriores.

Historial completo del chat:
{{{fullChatHistory}}}
`,
});

const generateUserProfileFlow = ai.defineFlow(
  {
    name: 'generateUserProfileFlow',
    inputSchema: GenerateUserProfileInputSchema,
    outputSchema: GenerateUserProfileOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);

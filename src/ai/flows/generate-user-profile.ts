'use server';

/**
 * @fileOverview A flow that generates a comprehensive psychological profile for a user
 * based on their entire chat history, including an emotional timeline.
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
      'El historial completo y unificado de todas las conversaciones de chat de un solo usuario, con cada mensaje precedido por su fecha y hora en formato ISO 8601 (ej. [YYYY-MM-DDTHH:mm:ss.sssZ]).'
    ),
});
export type GenerateUserProfileInput = z.infer<
  typeof GenerateUserProfileInputSchema
>;

const EmotionalStatePoint = z.object({
  date: z.string().describe('La fecha de la entrada (formato AAAA-MM-DD).'),
  sentiment: z
    .number()
    .min(-1)
    .max(1)
    .describe(
      'Un valor numérico para el sentimiento general de ese día (-1 para muy negativo, 0 para neutral, 1 para muy positivo).'
    ),
  summary: z
    .string()
    .describe('Un resumen muy breve de los temas o eventos clave del día.'),
  keyEvents: z.array(z.string()).describe('Una lista de 1 a 3 eventos o emociones clave del día (ej. "Pico de estrés laboral", "Conversación sobre relaciones").'),
});

const EmotionalConstellationNodeSchema = z.object({
  id: z.string().describe('El identificador único del tema principal (ej: "Trabajo", "Ansiedad", "Familia").'),
  val: z.number().describe('El peso o recurrencia del tema. Debe ser un entero positivo (ej: 10).'),
});

const EmotionalConstellationLinkSchema = z.object({
    source: z.string().describe('El ID del nodo de origen.'),
    target: z.string().describe('El ID del nodo de destino.'),
    sentiment: z.number().min(-1).max(1).describe('Un valor de -1 (muy negativo), 0 (neutral) a 1 (muy positivo) que representa la relación sentimental entre los dos temas.'),
});

const EmotionalConstellationSchema = z.object({
    nodes: z.array(EmotionalConstellationNodeSchema).describe('Una lista de los 5-8 temas más importantes o "planetas" en el universo emocional del usuario.'),
    links: z.array(EmotionalConstellationLinkSchema).describe('Una lista de las conexiones u "órbitas" entre los temas, describiendo cómo se relacionan entre sí.'),
});

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
  emotionalJourney: z
    .array(EmotionalStatePoint)
    .describe(
      'Una línea de tiempo de la evolución del estado de ánimo del usuario, extraída de los chats. Cada punto representa un día.'
    ),
  emotionalConstellation: EmotionalConstellationSchema.describe('Un grafo de conexiones que representa el universo temático y emocional del usuario.'),
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
  prompt: `Eres un psicólogo clínico experto y un analista de perfiles de IA. Tu tarea es analizar el historial completo de chats de un usuario para crear un perfil psicológico profundo, integrado y útil. Cada mensaje está precedido por su fecha y hora en formato ISO 8601. Debes sintetizar la información de todas las conversaciones para construir una comprensión continua de la persona. Sé innovador y proporciona información que sea genuinamente útil.

Mantén un tono profesional, empático y clínico en todo momento. Toda la salida DEBE estar en español.

Basado en el historial completo de chats proporcionado, genera un informe estructurado con las siguientes secciones:

1.  **Diagnóstico Descriptivo**: Identifica el estado psicológico más probable. Describe las tendencias emocionales y cognitivas observadas de forma profesional (ej. "El usuario muestra patrones persistentes de pensamiento ansioso y rumiación sobre eventos pasados", en lugar de "El usuario tiene ansiedad").

2.  **Caracterización de la Personalidad**: Detalla la personalidad del usuario. Menciona rasgos dominantes (ej. introversión, neuroticismo, apertura a la experiencia), su estilo cognitivo (ej. analítico, asociativo, rumiante), las emociones más frecuentes (ej. frustración, alegría, tristeza) y patrones de comportamiento recurrentes.

3.  **Fortalezas Psicológicas**: Identifica y describe los recursos y puntos fuertes del usuario. Busca signos de resiliencia, capacidad de introspección, empatía, autoconciencia, disciplina, creatividad o cualquier otra cualidad positiva que se manifieste.

4.  **Sesgos Cognitivos Potenciales**: Analiza el lenguaje para identificar posibles sesgos cognitivos. Proporciona una lista de 2-3 sesgos que parezcan más prominentes (ej. "Pensamiento de todo o nada: 'Si no logro esto, soy un completo fracaso'", "Filtro mental: Se enfoca en un solo detalle negativo de una situación, ignorando los aspectos positivos.").

5.  **Mecanismos de Defensa**: Infiere los posibles mecanismos de defensa que el usuario emplea para manejar el estrés o la disonancia cognitiva. Proporciona una lista de 2-3 mecanismos con una breve justificación (ej. "Racionalización: Justifica decisiones o resultados negativos con explicaciones lógicas para evitar sentir decepción.", "Evitación: Cambia de tema o minimiza la importancia de asuntos que le generan ansiedad.").

6.  **Recomendaciones Personalizadas**: Ofrece una lista de recomendaciones accionables y personalizadas para el bienestar y desarrollo del usuario. Estas deben estar directamente conectadas con los hallazgos de las secciones anteriores.

7.  **Línea de Tiempo Emocional (emotionalJourney)**: Analiza el historial de chat cronológicamente. Agrupa las conversaciones por día. Para cada día con actividad, crea un objeto que contenga:
    - \`date\`: La fecha en formato "AAAA-MM-DD", extraída directamente de la porción de la fecha de la marca de tiempo UTC/Zulu (Z).
    - \`sentiment\`: Un puntaje de sentimiento numérico de -1.0 (muy negativo) a 1.0 (muy positivo) para ese día.
    - \`summary\`: Un resumen de 1-2 frases sobre de qué se habló ese día.
    - \`keyEvents\`: Un array de hasta 3 strings describiendo picos de estrés o eventos clave (ej: "Conflicto laboral", "Reflexión sobre el futuro", "Pico de ansiedad").

8.  **Constelador Emocional (emotionalConstellation)**: Analiza la totalidad de las conversaciones para construir un grafo de conexiones temáticas.
    - Identifica entre 5 y 8 temas centrales y recurrentes en la vida del usuario (ej. "Trabajo", "Familia", "Ansiedad", "Autoestima", "Planes a Futuro"). Estos serán los \`nodes\`. El valor \`val\` de cada nodo debe representar su importancia o frecuencia (un entero, ej: 10 para el tema más importante).
    - Identifica las relaciones entre estos temas. Por ejemplo, si el usuario habla de "Trabajo" y "Ansiedad" juntos con frecuencia, crea un \`link\`.
    - Para cada \`link\`, determina el \`sentiment\` de la relación: -1 si la conexión es predominantemente negativa (ej. Trabajo causa Ansiedad), 1 si es positiva (ej. Amigos mejora la Autoestima), y 0 si es neutral o mixta.
    - El resultado debe ser un objeto con dos arrays: \`nodes\` y \`links\`.

Historial completo del chat (cada mensaje incluye su fecha en formato ISO 8601):
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

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
    target: z.string().describe('El ID del nodo de destino. No puede ser el mismo que el de origen.'),
    sentiment: z.number().min(-1).max(1).describe('Un valor de -1 (muy negativo), 0 (neutral) a 1 (muy positivo) que representa la relación sentimental entre los dos temas.'),
});

const EmotionalConstellationSchema = z.object({
    nodes: z.array(EmotionalConstellationNodeSchema).describe('Una lista de los 5-8 temas más importantes o "planetas" en el universo emocional del usuario.'),
    links: z.array(EmotionalConstellationLinkSchema).describe('Una lista de las conexiones u "órbitas" entre los temas, describiendo cómo se relacionan entre sí. Un nodo no puede estar conectado a sí mismo.'),
});

const CoreArchetypeSchema = z.object({
  title: z.string().describe('El nombre del arquetipo principal identificado (ej. "El Cuidador", "El Perfeccionista").'),
  description: z.string().describe('Una descripción detallada de este patrón arquetípico de ser, explicando cómo se manifiesta en el comportamiento del usuario.'),
  strengths: z.string().describe('Las luces o "superpoderes" de este arquetipo; sus cualidades positivas.'),
  challenges: z.string().describe('Las sombras o dificultades típicas asociadas con este arquetipo.'),
});

const HabitLoopSchema = z.object({
  trigger: z.string().describe('El disparador o situación recurrente que activa el patrón de comportamiento problemático.'),
  thought: z.string().describe('El pensamiento automático (sesgo cognitivo) que aparece inmediatamente después del disparador.'),
  action: z.string().describe('La acción o respuesta conductual (mecanismo de defensa) que se ejecuta como resultado del pensamiento.'),
  result: z.string().describe('La consecuencia a corto y largo plazo de este bucle, explicando cómo refuerza el problema.'),
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
  coreArchetype: CoreArchetypeSchema.describe('El arquetipo central que mejor representa el patrón de comportamiento del usuario.'),
  coreConflict: z.string().describe('El principal dilema o tensión interna que impulsa la mayor parte de la tensión psicológica del usuario (ej. "Independencia vs. Necesidad de Pertenencia").'),
  habitLoop: HabitLoopSchema.describe('Un análisis del principal bucle de comportamiento recurrente, mostrando cómo un disparador lleva a un resultado a través de un pensamiento y una acción.'),
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
  prompt: `Eres un psicólogo clínico experto y un analista de perfiles de IA. Tu tarea es analizar el historial completo de chats de un usuario para crear un "Cianotipo Psicológico": un perfil profundo, integrado y útil. Cada mensaje está precedido por su fecha y hora en formato ISO 8601. Debes sintetizar la información de todas las conversaciones para construir una comprensión continua de la persona. Sé innovador y proporciona información que sea genuinamente útil.

Mantén un tono profesional, empático y clínico en todo momento. Toda la salida DEBE estar en español.

Basado en el historial completo de chats proporcionado, genera un informe estructurado que incluya TODOS los siguientes ítems:

**ANÁLISIS CLÍNICO TRADICIONAL:**
1.  **Diagnóstico Descriptivo**: Identifica el estado psicológico más probable. Describe las tendencias emocionales y cognitivas observadas de forma profesional (ej. "El usuario muestra patrones persistentes de pensamiento ansioso y rumiación sobre eventos pasados", en lugar de "El usuario tiene ansiedad").
2.  **Caracterización de la Personalidad**: Detalla la personalidad del usuario. Menciona rasgos dominantes, su estilo cognitivo, emociones frecuentes y patrones de comportamiento recurrentes.
3.  **Fortalezas Psicológicas**: Identifica y describe los recursos y puntos fuertes del usuario (resiliencia, introspección, empatía, etc.).
4.  **Sesgos Cognitivos Potenciales**: Lista 2-3 sesgos cognitivos prominentes con ejemplos del chat (ej. "Pensamiento de todo o nada: 'Si no logro esto, soy un completo fracaso'").
5.  **Mecanismos de Defensa**: Infiere 2-3 mecanismos de defensa con justificación (ej. "Racionalización: Justifica resultados negativos con explicaciones lógicas.").
6.  **Recomendaciones**: Ofrece una lista de recomendaciones accionables y personalizadas para el bienestar.

**OBSERVACIÓN DE DATOS:**
7.  **Línea de Tiempo Emocional (emotionalJourney)**: Analiza el historial cronológicamente. Agrupa por día. Para cada día, crea un objeto con \`date\` (AAAA-MM-DD), \`sentiment\` (-1 a 1), \`summary\` y \`keyEvents\` (array de hasta 3 strings).
8.  **Constelador Emocional (emotionalConstellation)**: Construye un grafo con 5-8 temas centrales (\`nodes\`) y sus relaciones (\`links\`). Cada nodo tiene \`id\` y \`val\` (importancia). Cada link tiene \`source\`, \`target\` y \`sentiment\` (-1 a 1).

**DINÁMICA SUBYACENTE (NUEVO ANÁLISIS INTEGRADO):**
9.  **Arquetipo Central (coreArchetype)**: Basado en todo lo anterior, identifica UN arquetipo dominante (ej. "El Cuidador", "El Héroe", "El Perfeccionista"). Proporciona el \`title\`, una \`description\` detallada, sus \`strengths\` (luces) y sus \`challenges\` (sombras).
10. **Conflicto Nuclear (coreConflict)**: Infiere y describe la principal tensión o dilema interno que causa la mayor parte del estrés psicológico del usuario. Debe ser una frase concisa (ej: "El deseo de independencia contra el miedo a la soledad").
11. **Bucle del Hábito (habitLoop)**: Identifica el patrón de comportamiento problemático más recurrente y descríbelo en cuatro pasos: \`trigger\` (la situación que lo inicia), \`thought\` (el sesgo cognitivo que aparece), \`action\` (el mecanismo de defensa que se ejecuta) y \`result\` (la consecuencia que refuerza el ciclo).

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

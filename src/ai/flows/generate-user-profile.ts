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
  previousProfilesContext: z
    .string()
    .optional()
    .describe(
      'Un string opcional que contiene los perfiles JSON de análisis anteriores, proporcionados como contexto para identificar tendencias y cambios a lo largo del tiempo.'
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
      'Un diagnóstico descriptivo del estado psicológico actual, *comparándolo con análisis previos si se proporcionaron*. Debe ser redactado de manera profesional, empática y clara, enfocándose en tendencias y evoluciones.'
    ),
  personality: z
    .string()
    .describe(
      'Una caracterización detallada de la personalidad. Si hay perfiles previos, resalta si se observan cambios o consistencias en los rasgos, estilo cognitivo y emociones frecuentes.'
    ),
  strengths: z
    .string()
    .describe(
      'Análisis de las fortalezas y recursos psicológicos del usuario. Si hay datos previos, indica si se han fortalecido o si han surgido nuevas.'
    ),
  cognitiveBiases: z
    .array(z.string())
    .describe(
      'Identificación de sesgos cognitivos recurrentes. Compara con los sesgos anteriores y señala si persisten, han disminuido o han aparecido nuevos.'
    ),
  defenseMechanisms: z
    .array(z.string())
    .describe(
      'Inferencia de mecanismos de defensa. Compara con los anteriores para ver si el usuario está desarrollando formas de afrontamiento más maduras.'
    ),
  recommendations: z
    .array(z.string())
    .describe(
      'Una lista de recomendaciones personalizadas y accionables, ajustadas en función del progreso o los nuevos desafíos identificados desde el último análisis.'
    ),
  emotionalJourney: z
    .array(EmotionalStatePoint)
    .describe(
      'Una línea de tiempo de la evolución del estado de ánimo del usuario, extraída de los chats. Cada punto representa un día.'
    ),
  emotionalConstellation: EmotionalConstellationSchema.describe('Un grafo de conexiones que representa el universo temático y emocional del usuario.'),
  coreArchetype: CoreArchetypeSchema.describe('El arquetipo central que mejor representa el patrón de comportamiento del usuario. Señala si este arquetipo se ha consolidado o está evolucionando.'),
  coreConflict: z.string().describe('El principal dilema o tensión interna. Evalúa si este conflicto ha cambiado de intensidad o forma desde el último análisis.'),
  habitLoop: HabitLoopSchema.describe('Un análisis del principal bucle de comportamiento recurrente. Compara con bucles anteriores para ver si hay cambios en el patrón.'),
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
  prompt: `Eres un psicólogo clínico experto y un analista de perfiles de IA. Tu tarea es analizar el historial de chats de un usuario para crear un "Cianotipo Psicológico": un perfil profundo, integrado y útil. Tu característica más poderosa es tu capacidad de **comparar y analizar la evolución del usuario en el tiempo**.

Mantén un tono profesional, empático y clínico. Toda la salida DEBE estar en español.

**Instrucciones Clave:**
1.  Analiza el \`fullChatHistory\` proporcionado para entender el estado actual del usuario.
2.  Si se proporciona \`previousProfilesContext\`, úsalo como tu "memoria" de análisis pasados. Tu principal objetivo es identificar **tendencias, cambios, progresos y estancamientos**.
3.  En cada campo de tu respuesta (especialmente en el diagnóstico, personalidad y recomendaciones), debes hacer referencias explícitas a los cambios observados. Usa frases como "En comparación con el análisis anterior...", "Noto una evolución en...", "Este patrón persiste, pero su intensidad ha disminuido...", "Ha surgido un nuevo tema de preocupación relacionado con...".
4.  Si no hay perfiles previos, realiza el análisis basándote únicamente en el historial de chat actual.

Basado en el historial completo de chats y el contexto de perfiles anteriores, genera un informe estructurado que incluya TODOS los siguientes ítems:

**ANÁLISIS CLÍNICO TRADICIONAL (CON VISIÓN EVOLUTIVA):**
1.  **Diagnóstico Descriptivo**: Describe el estado psicológico actual, haciendo hincapié en la evolución desde el último informe.
2.  **Caracterización de la Personalidad**: Detalla la personalidad, resaltando consistencias o cambios en los rasgos.
3.  **Fortalezas Psicológicas**: Identifica recursos actuales y si son nuevos o se han fortalecido.
4.  **Sesgos Cognitivos Potenciales**: Lista los sesgos, señalando si son persistentes, nuevos o han disminuido.
5.  **Mecanismos de Defensa**: Infiere los mecanismos, indicando si han evolucionado hacia estrategias más maduras.
6.  **Recomendaciones**: Ofrece recomendaciones ajustadas al progreso y desafíos actuales del usuario.

**OBSERVACIÓN DE DATOS:**
7.  **Línea de Tiempo Emocional (emotionalJourney)**: Extrae el estado de ánimo diario del historial de chat.
8.  **Constelador Emocional (emotionalConstellation)**: Construye el grafo temático actual.

**DINÁMICA SUBYACENTE (ANÁLISIS INTEGRADO Y COMPARATIVO):**
9.  **Arquetipo Central (coreArchetype)**: Identifica el arquetipo dominante. ¿Se ha consolidado, o está mostrando nuevas facetas?
10. **Conflicto Nuclear (coreConflict)**: Describe el dilema central. ¿Ha cambiado su naturaleza o intensidad?
11. **Bucle del Hábito (habitLoop)**: Analiza el patrón de comportamiento más recurrente. ¿Es el mismo que antes, o ha mutado?

**Contexto de Perfiles Psicológicos Anteriores (si está disponible):**
{{{previousProfilesContext}}}

**Historial completo del chat (cada mensaje incluye su fecha en formato ISO 8601):**
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

    
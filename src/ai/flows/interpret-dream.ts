'use server';

/**
 * @fileOverview Interpreta un sueño en el contexto del perfil psicológico del usuario.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { ProfileData } from '@/lib/types';


const DreamInterpretationInputSchema = z.object({
    dreamDescription: z.string().describe('La descripción detallada del sueño contada por el usuario.'),
    userProfile: z.string().describe('El perfil psicológico completo del usuario en formato JSON. Proporciona el contexto para una interpretación personalizada.'),
});

const SymbolAnalysisSchema = z.object({
    symbol: z.string().describe('El elemento simbólico clave identificado en el sueño (ej. "un bosque oscuro", "una llave dorada").'),
    universalMeaning: z.string().describe('El significado arquetípico o junguiano universal de este símbolo.'),
    personalMeaning: z.string().describe('La interpretación personalizada del símbolo, conectándolo directamente con los conflictos, arquetipos o patrones del perfil psicológico del usuario.'),
    icon: z.string().describe('Un solo emoji que represente visualmente el símbolo.')
});

const DreamInterpretationOutputSchema = z.object({
    dreamTitle: z.string().describe('Un título poético y evocador para el sueño, de 4 a 6 palabras.'),
    dominantFeeling: z.string().describe('La emoción principal o atmósfera que prevalece en el sueño (ej. "Ansiedad y confusión", "Liberación y alegría").'),
    coreArchetype: z.string().describe('El arquetipo junguiano principal que parece estar activo en este sueño (ej. "La Sombra", "El Héroe", "El Trickster").'),
    symbolAnalysis: z.array(SymbolAnalysisSchema).describe('Un análisis de 3 a 5 de los símbolos más importantes del sueño.'),
    narrativeInterpretation: z.string().describe('Una interpretación de la "trama" del sueño, explicándola como una metáfora de un conflicto, deseo o proceso psicológico que el usuario está viviendo, basándose en su perfil.'),
    reflectiveQuestion: z.string().describe('Una pregunta final, poderosa y abierta, diseñada para que el usuario reflexione sobre la conexión entre el sueño y su vida.'),
});


export type InterpretDreamInput = z.infer<typeof DreamInterpretationInputSchema>;
export type DreamInterpretation = z.infer<typeof DreamInterpretationOutputSchema>;


export async function interpretDream(input: InterpretDreamInput): Promise<DreamInterpretation> {
  return interpretDreamFlow(input);
}


const prompt = ai.definePrompt({
    name: 'interpretDreamPrompt',
    input: { schema: DreamInterpretationInputSchema },
    output: { schema: DreamInterpretationOutputSchema },
    prompt: `Eres un experto analista de sueños junguiano con un profundo conocimiento de la psicología arquetípica. Tu tarea es analizar la descripción de un sueño proporcionada por un usuario y ofrecer una interpretación rica y perspicaz, conectándola de manera explícita con su perfil psicológico.

**Contexto del Usuario (Perfil Psicológico):**
{{{userProfile}}}

**Descripción del Sueño:**
{{{dreamDescription}}}

**Tu Proceso de Análisis:**
1.  **Deconstrucción:** Identifica los elementos clave del sueño: el escenario, los personajes (incluido el "yo onírico"), los objetos, la trama y las emociones dominantes.
2.  **Conexión Arquetípica:** Busca resonancias entre los símbolos del sueño y el perfil del usuario. ¿Cómo se relaciona el sueño con su 'coreConflict', 'coreArchetype', sus sesgos o mecanismos de defensa?
3.  **Síntesis Interpretativa:** Construye una interpretación coherente que no sea un simple diccionario de símbolos, sino una narrativa que ilumine un proceso interno del usuario.

**Genera una respuesta estructurada en el siguiente formato JSON:**
-   **dreamTitle:** Un título poético para el sueño.
-   **dominantFeeling:** La emoción central del sueño.
-   **coreArchetype:** El arquetipo junguiano principal activo en el sueño.
-   **symbolAnalysis:** Un array de 3-5 símbolos clave. Para cada uno, proporciona el símbolo, su significado universal, su significado **personalizado** (conectado al perfil) y un emoji representativo.
-   **narrativeInterpretation:** Explica la trama del sueño como una metáfora del viaje psicológico del usuario.
-   **reflectiveQuestion:** Formula una pregunta final, incisiva y abierta, que invite al usuario a una profunda introspección.

Mantén un tono empático, sabio y ligeramente místico. Tu objetivo es empoderar al usuario para que vea sus sueños como un diálogo con su propio subconsciente.
`,
});


const interpretDreamFlow = ai.defineFlow(
  {
    name: 'interpretDreamFlow',
    inputSchema: DreamInterpretationInputSchema,
    outputSchema: DreamInterpretationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('La IA no pudo generar una interpretación del sueño.');
    }
    return output;
  }
);

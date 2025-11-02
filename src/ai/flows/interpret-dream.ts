
'use server';

/**
 * @fileOverview Interpreta un sueño en el contexto del perfil psicológico del usuario y desde una perspectiva elegida.
 */

import { ai } from '@/ai/genkit';
import { DreamInterpretationInputSchema, DreamInterpretationContentSchema, type InterpretDreamInput, type DreamInterpretation } from '@/lib/types';


// Define el prompt unificado de la IA
const interpretDreamPrompt = ai.definePrompt({
    name: 'interpretDreamPrompt',
    input: { schema: DreamInterpretationInputSchema },
    output: { schema: DreamInterpretationContentSchema },
    prompt: `Eres un experto analista de sueños. Tu tarea es analizar la descripción de un sueño proporcionada por un usuario y ofrecer una interpretación rica y perspicaz, conectándola de manera explícita con su perfil psicológico.

Adoptarás la siguiente perspectiva para tu análisis:
**Perspectiva del Especialista:** {{{perspective}}}

**Contexto del Usuario (Perfil Psicológico):**
{{{userProfile}}}

**Descripción del Sueño:**
{{{dreamDescription}}}

**Tu Proceso de Análisis:**
1.  **Deconstrucción:** Identifica los elementos clave del sueño: el escenario, los personajes, los objetos, la trama y las emociones dominantes.
2.  **Conexión Arquetípica:** Busca resonancias entre los símbolos del sueño y el perfil del usuario. ¿Cómo se relaciona el sueño con su 'coreConflict', 'coreArchetype', sus sesgos o mecanismos de defensa?
3.  **Síntesis Interpretativa:** Construye una interpretación coherente que no sea un simple diccionario de símbolos, sino una narrativa que ilumine un proceso interno del usuario.

**Genera una respuesta estructurada en el siguiente formato JSON:**
-   **dreamTitle:** Un título poético y evocador para el sueño, acorde a la perspectiva elegida.
-   **dominantFeeling:** La emoción central del sueño.
-   **coreArchetype:** El arquetipo (psicológico, espiritual o chamánico) principal activo en el sueño.
-   **symbolAnalysis:** Un array de 3-5 símbolos clave. Para cada uno, proporciona el símbolo, su significado universal, su significado **personalizado** (conectado al perfil) y un emoji representativo. La interpretación debe reflejar la perspectiva elegida.
-   **narrativeInterpretation:** Explica la trama del sueño como una metáfora del viaje del usuario, desde la perspectiva elegida.
-   **reflectiveQuestion:** Formula una pregunta final, incisiva y abierta, que invite al usuario a una profunda introspección, alineada con la perspectiva.

Mantén un tono empático, sabio y coherente con la perspectiva del especialista elegido. Tu objetivo es empoderar al usuario para que vea sus sueños como un diálogo con su propio subconsciente.
`,
});

// Define y exporta el flujo principal.
const interpretDreamFlow = ai.defineFlow(
  {
    name: 'interpretDreamFlow',
    inputSchema: DreamInterpretationInputSchema,
    outputSchema: DreamInterpretationContentSchema,
  },
  async (input) => {
    const { output } = await interpretDreamPrompt(input);
    if (!output) {
      throw new Error('La IA no pudo generar una interpretación del sueño.');
    }
    return output;
  }
);


export async function interpretDream(input: InterpretDreamInput): Promise<DreamInterpretation> {
  return interpretDreamFlow(input);
}

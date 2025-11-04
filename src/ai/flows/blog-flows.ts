
'use server';
/**
 * @fileOverview Flujos de Genkit para la generación de contenido del blog.
 *
 * - dispatchArticleWriter: Selecciona al escritor IA especialista adecuado según la categoría.
 * - generateArticleTitles: Genera una lista de títulos de artículos.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  GenerateArticleTitlesInputSchema,
  GenerateArticleTitlesOutputSchema,
  GenerateArticleContentInputSchema,
  GenerateArticleContentOutputSchema,
} from '@/lib/types';
import { slugify } from '@/lib/utils';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

// --- Despachador de Escritores Especialistas ---

const writerMap = {
  'terapia-cognitivo-conductual': 'tcc',
  'ansiedad-y-estres': 'tcc',
  'mindfulness-y-aceptacion': 'mindfulness',
  'relaciones-interpersonales': 'relationships',
  'salud-emocional': 'general',
  'crecimiento-personal': 'general',

};

export const dispatchArticleWriter = ai.defineFlow(
  {
    name: 'dispatchArticleWriterFlow',
    inputSchema: GenerateArticleContentInputSchema,
    outputSchema: GenerateArticleContentOutputSchema,
  },
  async (input) => {
    const writerType = writerMap[input.category as keyof typeof writerMap] || 'general';

    let writerPrompt;
    switch (writerType) {
      case 'tcc':
        writerPrompt = tccWriterPrompt;
        break;
      case 'mindfulness':
        writerPrompt = mindfulnessWriterPrompt;
        break;
      case 'relationships':
        writerPrompt = relationshipsWriterPrompt;
        break;
      default:
        writerPrompt = generalPsychologistPrompt;
    }

    const { output } = await writerPrompt(input);
    if (!output?.content) {
      throw new Error('El especialista de IA no pudo generar el contenido del artículo.');
    }
    return output;
  }
);


// --- PROMPTS DE ESCRITORES ESPECIALISTAS ---

const commonPromptStructure = `
Eres un psicólogo experto y un comunicador excepcional, con la habilidad de hacer accesibles conceptos complejos. Tu tarea es escribir un artículo completo y de alta calidad en formato Markdown sobre el tema: "{{title}}".

**ROL DEL ESPECIALISTA PARA ESTE ARTÍCULO: {{expert_role}}**

**ESTRUCTURA OBLIGATORIA DEL ARTÍCULO:**

1.  **Título Principal:** Comienza el artículo con el título exacto proporcionado, formateado como un encabezado H1 en Markdown (ej. \`# Título del Artículo\`).
2.  **Introducción Empática:** Inicia con un párrafo que conecte con la experiencia emocional del lector respecto al tema. Valida sus sentimientos y presenta el problema.
3.  **Metáfora Central y Reencuadre:** Introduce una metáfora poderosa y relevante para reencuadrar el problema desde la perspectiva de tu especialidad. Este es el "aha moment" del artículo.
4.  **Secciones de Desarrollo (Mínimo 3):**
    *   Usa subtítulos H2 (ej. \`## Título de la Sección\`) para cada sección.
    *   Desarrolla el reencuadre con explicaciones claras basadas en tu especialidad.
    *   Ofrece una lista de consejos prácticos, técnicas específicas de tu campo o pasos numerados.
5.  **Conclusión ("Tu Nuevo Guion"):** Resume la nueva perspectiva y termina con un párrafo final que empodere al lector a aplicar lo aprendido, reforzando la idea central de tu rol como especialista.

**REGLAS INNEGOCIABLES:**
- **Longitud Mínima:** El artículo DEBE tener un mínimo de 800 palabras.
- **Tono:** Informativo, empático, práctico y alentador, siempre desde tu rol de especialista.
- **Formato:** Usa negritas, listas y otros elementos de Markdown para una lectura fácil.
- **CRÍTICO: NO te detengas hasta que la sección 'Conclusión' esté completamente escrita. Un artículo incompleto es un fallo total.**

Ahora, escribe el artículo completo sobre: "{{title}}".
`;

// 1. Escritor Generalista / Psicólogo Positivo
const generalPsychologistPrompt = ai.definePrompt({
  name: 'generalPsychologistWriter',
  input: { schema: GenerateArticleContentInputSchema.extend({ expert_role: z.string().default('Psicólogo y Coach de Crecimiento Personal') }) },
  output: { schema: GenerateArticleContentOutputSchema },
  prompt: commonPromptStructure,
});

// 2. Escritor Experto en TCC
const tccWriterPrompt = ai.definePrompt({
  name: 'tccWriterPrompt',
  input: { schema: GenerateArticleContentInputSchema.extend({ expert_role: z.string().default('Experto en Terapia Cognitivo-Conductual (TCC)') }) },
  output: { schema: GenerateArticleContentOutputSchema },
  prompt: commonPromptStructure,
});

// 3. Escritor Guía de Mindfulness
const mindfulnessWriterPrompt = ai.definePrompt({
  name: 'mindfulnessWriterPrompt',
  input: { schema: GenerateArticleContentInputSchema.extend({ expert_role: z.string().default('Guía de Mindfulness y Aceptación') }) },
  output: { schema: GenerateArticleContentOutputSchema },
  prompt: commonPromptStructure,
});

// 4. Escritor Coach de Relaciones
const relationshipsWriterPrompt = ai.definePrompt({
  name: 'relationshipsWriterPrompt',
  input: { schema: GenerateArticleContentInputSchema.extend({ expert_role: z.string().default('Coach de Relaciones y Comunicación Asertiva') }) },
  output: { schema: GenerateArticleContentOutputSchema },
  prompt: commonPromptStructure,
});


// --- Flujo para generar Títulos de Artículos (sin cambios) ---

const articleTitlesPrompt = ai.definePrompt({
  name: 'articleTitlesPrompt',
  input: { schema: GenerateArticleTitlesInputSchema },
  output: { schema: GenerateArticleTitlesOutputSchema },
  prompt: `Eres un editor experto en una prestigiosa revista de psicología y bienestar. Para la categoría "{{category}}", genera una lista de 7 títulos de artículos que sean atractivos, prácticos y orientados a la acción. Los títulos deben despertar la curiosidad y prometer un beneficio claro al lector.

Ejemplos para la categoría "Ansiedad":
- "Maneja Emociones Intensas: 6 Tácticas TCC Para La Calma Y El Control Interno"
- "El Vínculo Sorprendente entre tu Intestino y la Ansiedad: Qué Comer para Sentirte Mejor"
- "Reconfigura tu Cerebro: Cómo la TCC puede Cambiar tu Relación con la Ansiedad"

Ahora, genera los títulos para la categoría: "{{category}}".
`,
});

export const generateArticleTitles = ai.defineFlow(
  {
    name: 'generateArticleTitlesFlow',
    inputSchema: GenerateArticleTitlesInputSchema,
    outputSchema: GenerateArticleTitlesOutputSchema,
  },
  async (input) => {
    const { output } = await articleTitlesPrompt(input);
    if (!output?.titles || output.titles.length === 0) {
      throw new Error('No se pudieron generar títulos de artículos.');
    }
    return output;
  }
);

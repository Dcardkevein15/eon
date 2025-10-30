'use server';
/**
 * @fileOverview Flujos de Genkit para la generación de contenido del blog.
 *
 * - generateArticleTitles: Genera una lista de títulos de artículos para una categoría.
 * - generateArticleContent: Genera el contenido completo de un artículo a partir de un título y lo guarda en Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  GenerateArticleTitlesInputSchema,
  GenerateArticleTitlesOutputSchema,
  GenerateArticleContentInputSchema,
  GenerateArticleContentOutputSchema,
  type GenerateArticleTitlesInput,
  type GenerateArticleContentInput,
  type GenerateArticleContentOutput,
} from '@/lib/types';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase'; // Assuming server-side firebase instance


// --- Flujo para generar Títulos de Artículos ---

const articleTitlesPrompt = ai.definePrompt({
  name: 'articleTitlesPrompt',
  input: { schema: GenerateArticleTitlesInputSchema },
  output: { schema: GenerateArticleTitlesOutputSchema },
  prompt: `Eres un editor experto en una prestigiosa revista de psicología y bienestar. Para la categoría "{{category}}", genera una lista de 7 títulos de artículos que sean atractivos, prácticos y orientados a la acción. Los títulos deben despertar la curiosidad y prometer un beneficio claro al lector.

Ejemplos para la categoría "Ansiedad":
- "5 Técnicas de Anclaje para Detener un Ataque de Pánico en Seco"
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


// --- Flujo para generar y guardar Contenido de Artículo ---

const articleContentPrompt = ai.definePrompt({
  name: 'articleContentPrompt',
  input: { schema: GenerateArticleContentInputSchema },
  output: { schema: GenerateArticleContentOutputSchema },
  prompt: `Eres un psicólogo experto y un excelente comunicador, especializado en la categoría de "{{category}}". Tu tarea es escribir un artículo completo y bien estructurado en formato Markdown sobre el siguiente tema:

**Título: {{title}}**

El artículo debe ser:
- **Informativo y Práctico:** Ofrece consejos accionables, técnicas y explicaciones claras.
- **Estructurado:** Usa subtítulos (##) para organizar el contenido en secciones lógicas.
- **Empático:** Utiliza un tono comprensivo y alentador.
- **Basado en Evidencia:** Aunque eres una IA, escribe como si te basaras en principios psicológicos establecidos.
- **Completo:** Debe tener una introducción que enganche, un cuerpo de desarrollo con varias secciones y una conclusión que resuma los puntos clave.
- **Formato Markdown:** Usa negritas, listas y otros elementos de Markdown para mejorar la legibilidad.

Escribe el artículo ahora.
`,
});

export const generateArticleContent = ai.defineFlow(
  {
    name: 'generateArticleContentFlow',
    inputSchema: GenerateArticleContentInputSchema,
    outputSchema: GenerateArticleContentOutputSchema,
  },
  async (input) => {
    // 1. Check if the article exists in Firestore
    const articleRef = doc(firestore, 'articles', input.slug);
    const docSnap = await getDoc(articleRef);

    if (docSnap.exists()) {
      return { content: docSnap.data().content };
    }

    // 2. If not, generate it
    const { output: generatedOutput } = await articleContentPrompt(input);
     if (!generatedOutput?.content) {
      throw new Error('No se pudo generar el contenido del artículo.');
    }

    // 3. Save it for next time
    await setDoc(articleRef, {
        title: input.title,
        slug: input.slug,
        category: input.category,
        content: generatedOutput.content,
        createdAt: serverTimestamp(),
    });

    return generatedOutput;
  }
);
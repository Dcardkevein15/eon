
'use server';
/**
 * @fileOverview Flujos de Genkit para la generación de contenido del blog.
 *
 * - generateArticleTitles: Genera una lista de títulos de artículos para una categoría.
 * - generateArticleContent: Genera el contenido completo de un artículo a partir de un título.
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
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';


// --- Flujo para generar Títulos de Artículos ---

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
    
    // Asynchronously save titles to Firestore without blocking the response
    const titlesCollectionRef = collection(firestore, 'suggestedArticleTitles');
    const categorySlug = slugify(input.category);

    output.titles.forEach(title => {
        const newTitle = {
            title: title,
            category: input.category,
            categorySlug: categorySlug,
            slug: slugify(title),
            createdAt: serverTimestamp()
        };
        addDoc(titlesCollectionRef, newTitle).catch(error => {
            console.error("Error saving suggested title to Firestore:", error);
        });
    });

    return output;
  }
);


// --- Flujo para generar Contenido de Artículo ---

const articleContentPrompt = ai.definePrompt({
  name: 'articleContentPrompt',
  input: { schema: GenerateArticleContentInputSchema },
  output: { schema: GenerateArticleContentOutputSchema },
  prompt: `Eres un psicólogo experto y un comunicador excepcional, con la habilidad de hacer accesibles conceptos complejos. Tu tarea es escribir un artículo completo y de alta calidad en formato Markdown sobre el tema: "{{title}}".

**ESTRUCTURA OBLIGATORIA DEL ARTÍCULO:**

1.  **Título Principal:** Comienza el artículo con el título exacto proporcionado, formateado como un encabezado H1 en Markdown (ej. \`# Título del Artículo\`).
2.  **Introducción Empática:** Inicia con un párrafo que conecte con la experiencia emocional del lector respecto al tema. Valida sus sentimientos.
3.  **Metáfora Central y Reencuadre:** Presenta una metáfora poderosa para reencuadrar el problema. Este es el "aha moment" que cambiará la perspectiva del lector.
4.  **Secciones de Desarrollo (Mínimo 3):**
    *   Usa subtítulos H2 (ej. \`## Título de la Sección\`) para cada sección.
    *   Desarrolla el reencuadre con explicaciones claras.
    *   Ofrece una lista de consejos prácticos, técnicas o pasos numerados.
5.  **Conclusión Inspiradora:** Resume la nueva perspectiva y termina con un párrafo final que empodere al lector a aplicar lo aprendido.

**REGLAS INNEGOCIABLES:**
- **Longitud Mínima:** El artículo DEBE tener un mínimo de 600 palabras.
- **Tono:** Informativo, empático, práctico y alentador.
- **Formato:** Usa negritas, listas y otros elementos de Markdown para una lectura fácil.
- **CRÍTICO: NO te detengas hasta que la sección 'Conclusión' esté completamente escrita. Un artículo incompleto es un fallo total.**

Ahora, escribe el artículo completo sobre: "{{title}}".`,
});

export const generateArticleContent = ai.defineFlow(
  {
    name: 'generateArticleContentFlow',
    inputSchema: GenerateArticleContentInputSchema,
    outputSchema: GenerateArticleContentOutputSchema,
  },
  async (input) => {
    const { output: generatedOutput } = await articleContentPrompt(input);
    if (!generatedOutput?.content) {
      throw new Error('No se pudo generar el contenido del artículo.');
    }
    
    return generatedOutput;
  }
);

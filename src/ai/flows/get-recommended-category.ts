
'use server';
/**
 * @fileOverview Recomienda una categoría de blog basada en el perfil psicológico del usuario.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define el esquema de entrada con el perfil del usuario.
const RecommendCategoryInputSchema = z.object({
  userProfile: z.string().describe('El perfil psicológico completo del usuario en formato JSON.'),
});
export type RecommendCategoryInput = z.infer<typeof RecommendCategoryInputSchema>;

// Define el esquema de salida del prompt (solo el nombre de la categoría)
const AIOutputSchema = z.object({
  categoryName: z.string().describe('El nombre de la categoría más relevante (ej. "Ansiedad y Estrés").'),
});

// Define el esquema de salida final de la función, que es lo que la app espera.
const RecommendedCategorySchema = z.object({
  categoryName: z.string().describe('El nombre de la categoría recomendada (ej. "Ansiedad y Estrés").'),
  categorySlug: z.string().describe('El slug de la categoría para la URL (ej. "ansiedad-y-estres").'),
});
export type RecommendCategoryOutput = z.infer<typeof RecommendedCategorySchema>;


// Define el prompt de la IA.
const recommendCategoryPrompt = ai.definePrompt({
  name: 'recommendCategoryPrompt',
  input: { schema: RecommendCategoryInputSchema },
  output: { schema: AIOutputSchema },
  config: {
    safetySettings: [
        {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
        }
    ]
  },
  prompt: `Eres un psicólogo experto. Analiza el siguiente perfil psicológico y determina cuál de las siguientes categorías de blog sería MÁS beneficiosa para el usuario.

**Perfil del Usuario:**
{{{userProfile}}}

**Categorías Disponibles para inspirarte (elige la que mejor se adapte):**
- Terapia Cognitivo-Conductual
- Ansiedad y Estrés
- Mindfulness y Aceptación
- Relaciones Interpersonales
- Salud Emocional
- Crecimiento Personal

Devuelve SOLAMENTE el nombre de la categoría más relevante. Por ejemplo: { "categoryName": "Ansiedad y Estrés" }. NO añadas ninguna explicación.
`,
});

// Define y exporta el flujo principal.
export const getRecommendedCategory = ai.defineFlow(
  {
    name: 'getRecommendedCategoryFlow',
    inputSchema: RecommendCategoryInputSchema,
    outputSchema: RecommendedCategorySchema, 
  },
  async (input) => {
    const { output } = await recommendCategoryPrompt(input);
    
    if (!output?.categoryName) {
      throw new Error('No se pudo generar una recomendación de categoría.');
    }

    const aiCategory = output.categoryName.toLowerCase();
    
    const categoryMap: Record<string, { name: string; slug: string }> = {
      'terapia cognitivo-conductual': { name: 'Terapia Cognitivo-Conductual', slug: 'terapia-cognitivo-conductual' },
      'ansiedad y estrés': { name: 'Ansiedad y Estrés', slug: 'ansiedad-y-estres' },
      'mindfulness y aceptación': { name: 'Mindfulness y Aceptación', slug: 'mindfulness-y-aceptacion' },
      'relaciones interpersonales': { name: 'Relaciones Interpersonales', slug: 'relaciones-interpersonales' },
      'salud emocional': { name: 'Salud Emocional', slug: 'salud-emocional' },
      'crecimiento personal': { name: 'Crecimiento Personal', slug: 'crecimiento-personal' }
    };
    
    // Find the best match
    const foundCategory = Object.keys(categoryMap).find(key => aiCategory.includes(key));
    
    if (foundCategory) {
      return categoryMap[foundCategory];
    }

    // Fallback a una categoría por defecto si no hay coincidencia
    return { name: 'Crecimiento Personal', slug: 'crecimiento-personal' };
  }
);

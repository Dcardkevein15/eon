
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
  input: { schema: z.object({ keyTopics: z.string() }) },
  output: { schema: AIOutputSchema },
  prompt: `Eres un editor de contenido experto. Basándote en los siguientes temas de interés y patrones de pensamiento de un usuario, determina cuál de las siguientes categorías de blog sería MÁS relevante.

**Temas Clave del Usuario:**
{{{keyTopics}}}

**Categorías Disponibles:**
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
    // 1. Extraer solo la información necesaria y menos sensible del perfil.
    let keyTopics = "Temas generales de crecimiento personal.";
    try {
        const profile = JSON.parse(input.userProfile);
        const topics = profile.emotionalConstellation?.nodes?.map((n: any) => n.id) || [];
        const biases = profile.cognitiveBiases || [];
        const allTopics = [...topics, ...biases];
        if (allTopics.length > 0) {
            keyTopics = allTopics.join(', ');
        }
    } catch (e) {
        console.error("Could not parse user profile to extract key topics.", e);
        // El valor por defecto de keyTopics se usará si el perfil está malformado.
    }


    // 2. Llamar a la IA con la entrada simplificada.
    const { output } = await recommendCategoryPrompt({ keyTopics });
    
    if (!output?.categoryName) {
      throw new Error('No se pudo generar una recomendación de categoría.');
    }

    // 3. Mapear la respuesta de la IA a una categoría válida.
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

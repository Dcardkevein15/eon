
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

// Define el esquema de salida. Ahora esperamos un array de recomendaciones.
const RecommendedCategorySchema = z.object({
  categoryName: z.string().describe('El nombre de la categoría recomendada (ej. "Ansiedad y Estrés").'),
  categorySlug: z.string().describe('El slug de la categoría para la URL (ej. "ansiedad-y-estres").'),
});

const RecommendCategoryOutputSchema = z.object({
    recommendations: z.array(RecommendedCategorySchema).describe('Una lista ordenada de las 3 categorías más relevantes.'),
});
export type RecommendCategoryOutput = z.infer<typeof RecommendCategoryOutputSchema>;


// Define el prompt de la IA.
const recommendCategoryPrompt = ai.definePrompt({
  name: 'recommendCategoryPrompt',
  input: { schema: RecommendCategoryInputSchema },
  output: { schema: RecommendCategoryOutputSchema },
  prompt: `Eres un psicólogo experto que debe recomendar categorías de lectura a un usuario. Analiza el siguiente perfil psicológico y determina cuáles de las siguientes categorías serían MÁS beneficiosa para el usuario en este momento. Basa tu decisión en el diagnóstico, el conflicto nuclear y los sesgos cognitivos.

**Perfil del Usuario:**
{{{userProfile}}}

**Categorías Disponibles:**
- "Terapia Cognitivo-Conductual" (slug: "terapia-cognitivo-conductual")
- "Ansiedad y Estrés" (slug: "ansiedad-y-estres")
- "Mindfulness y Aceptación" (slug: "mindfulness-y-aceptacion")
- "Relaciones Interpersonales" (slug: "relaciones-interpersonales")
- "Salud Emocional" (slug: "salud-emocional")
- "Crecimiento Personal" (slug: "crecimiento-personal")

Tu respuesta DEBE ser únicamente un objeto JSON con una clave "recommendations" que contenga un array de las 3 categorías más relevantes, ordenadas de mayor a menor importancia. No añadas ninguna explicación.`,
});

// Define y exporta el flujo principal.
export const getRecommendedCategory = ai.defineFlow(
  {
    name: 'getRecommendedCategoryFlow',
    inputSchema: RecommendCategoryInputSchema,
    // La salida del flujo sigue siendo una sola categoría para mantener la compatibilidad con el resto de la app.
    outputSchema: RecommendedCategorySchema, 
  },
  async (input) => {
    const { output } = await recommendCategoryPrompt(input);
    
    // Si la IA no devuelve recomendaciones o la lista está vacía, lanza un error claro.
    if (!output?.recommendations || output.recommendations.length === 0) {
      throw new Error('No se pudo generar una recomendación de categoría.');
    }
    
    // Devuelve solo la recomendación principal (la primera de la lista).
    return output.recommendations[0];
  }
);

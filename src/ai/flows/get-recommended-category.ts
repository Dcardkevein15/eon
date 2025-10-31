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

// Define el esquema de salida con el nombre y el slug de la categoría.
const RecommendCategoryOutputSchema = z.object({
  categoryName: z.string().describe('El nombre de la categoría recomendada (ej. "Ansiedad y Estrés").'),
  categorySlug: z.string().describe('El slug de la categoría para la URL (ej. "ansiedad-y-estres").'),
});
export type RecommendCategoryOutput = z.infer<typeof RecommendCategoryOutputSchema>;

// Define el prompt de la IA.
const recommendCategoryPrompt = ai.definePrompt({
  name: 'recommendCategoryPrompt',
  input: { schema: RecommendCategoryInputSchema },
  output: { schema: RecommendCategoryOutputSchema },
  prompt: `Eres un psicólogo experto que debe recomendar una categoría de lectura a un usuario. Analiza el siguiente perfil psicológico y determina cuál de las siguientes categorías sería MÁS beneficiosa para el usuario en este momento. Basa tu decisión en el diagnóstico, el conflicto nuclear y los sesgos cognitivos.

**Perfil del Usuario:**
{{{userProfile}}}

**Categorías Disponibles:**
- "Terapia Cognitivo-Conductual" (slug: "terapia-cognitivo-conductual")
- "Ansiedad y Estrés" (slug: "ansiedad-y-estres")
- "Mindfulness y Aceptación" (slug: "mindfulness-y-aceptacion")
- "Relaciones Interpersonales" (slug: "relaciones-interpersonales")
- "Salud Emocional" (slug: "salud-emocional")
- "Crecimiento Personal" (slug: "crecimiento-personal")

Tu respuesta DEBE ser únicamente un objeto JSON con el nombre y el slug de la categoría más relevante. No añadas ninguna explicación.`,
});

// Define y exporta el flujo principal.
export const getRecommendedCategory = ai.defineFlow(
  {
    name: 'getRecommendedCategoryFlow',
    inputSchema: RecommendCategoryInputSchema,
    outputSchema: RecommendCategoryOutputSchema,
  },
  async (input) => {
    const { output } = await recommendCategoryPrompt(input);
    if (!output) {
      throw new Error('No se pudo generar una recomendación de categoría.');
    }
    return output;
  }
);

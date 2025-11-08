'use server';
/**
 * @fileOverview An AI flow for finding and interpreting "Bible Codes" in the Torah.
 *
 * - runTorahCodeAnalysis: The main flow orchestrator.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { TORAH_TEXT } from '@/lib/torah-text';
import type { TorahCodeAnalysis } from '@/lib/types';

// --- SCHEMA DEFINITIONS ---

const TorahCodeInputSchema = z.object({
  searchTerm: z.string().describe('El término o concepto que el usuario quiere buscar en la Torá, en español.'),
});

const HebrewTranslationOutputSchema = z.object({
  hebrewTerm: z.string().describe('El término de búsqueda traducido al hebreo, sin vocales ni puntuación.'),
  optimalSkip: z.number().int().positive().describe('La distancia de salto (skip) que la IA considera óptima para buscar este término específico.'),
});

const AnalysisResultSchema = z.object({
  foundTerm: z.string().describe('El término hebreo encontrado.'),
  skip: z.number().int().describe('El salto utilizado para encontrar el término.'),
  startIndex: z.number().int().describe('El índice de inicio donde se encontró la primera letra del término.'),
  matrix: z.array(z.array(z.string())).describe('Una matriz de 21x21 de letras hebreas centrada en el término encontrado.'),
  revelation: z.string().describe('Una interpretación perspicaz de la matriz, explicando las palabras cruzadas y su posible significado contextual, traducido al español.'),
});

// --- HELPER FUNCTIONS ---

/**
 * Searches for an ELS (Equidistant Letter Sequence) in the Torah text.
 */
function findELS(text: string, word: string, skip: number): number {
  const wordLen = word.length;
  const textLen = text.length;
  for (let i = 0; i < textLen; i++) {
    let found = true;
    for (let j = 0; j < wordLen; j++) {
      const nextCharIndex = i + j * skip;
      if (nextCharIndex >= textLen || text[nextCharIndex] !== word[j]) {
        found = false;
        break;
      }
    }
    if (found) {
      return i; // Return start index
    }
  }
  return -1; // Not found
}

/**
 * Extracts a matrix of characters around a found ELS.
 */
function extractMatrix(text: string, startIndex: number, skip: number, wordLength: number, size: number = 21): string[][] {
    const matrix: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));
    const center = Math.floor(size / 2);

    // Heuristic to center the matrix not just on the start, but on the middle of the found word.
    const centerOfWordIndex = startIndex + Math.floor(wordLength / 2) * skip;
    const matrixStartIndex = centerOfWordIndex - (center * size) - center;

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const index = matrixStartIndex + (row * size) + col;
            if (index >= 0 && index < text.length) {
                matrix[row][col] = text[index];
            }
        }
    }
    return matrix;
}

// --- AI PROMPTS ---

const translationPrompt = ai.definePrompt({
    name: 'torahCodeTranslationPrompt',
    input: { schema: TorahCodeInputSchema },
    output: { schema: HebrewTranslationOutputSchema },
    prompt: `Eres un experto en lingüística hebrea y criptografía bíblica. La tarea es doble:
1.  Traduce el siguiente término en español a su forma raíz más probable en hebreo antiguo, sin vocales ni puntuación.
2.  Basado en la naturaleza del término (si es un nombre, un concepto, una acción), diseña y devuelve una "ecuación de salto" óptima. Este es un número entero positivo que crees que es más probable que revele conexiones significativas para este término específico. Sé creativo y numerológico. Un número pequeño (2-50) es para búsquedas densas, mientras que un número grande (ej. 129, 333) puede ser para conceptos más esotéricos.

Término en español: "{{{searchTerm}}}"`,
});


const revelationPrompt = ai.definePrompt({
    name: 'torahCodeRevelationPrompt',
    input: { schema: z.object({
        searchTerm: z.string(),
        hebrewTerm: z.string(),
        matrix: z.string(), // The matrix stringified
    })},
    output: { schema: z.object({ revelation: z.string() }) },
    prompt: `Eres un rabino cabalista y un maestro de la Gematria. Has descubierto una matriz de letras en la Torá alrededor de la palabra clave "{{hebrewTerm}}" (que significa "{{searchTerm}}").

Tu tarea es analizar esta matriz para encontrar palabras o conceptos ocultos. Busca palabras que se lean horizontalmente (de derecha a izquierda), verticalmente (de arriba a abajo) o diagonalmente.

Matriz de Letras:
{{{matrix}}}

Analiza las palabras y conceptos que se cruzan con o están cerca de la palabra clave principal. Explica sus significados y cómo podrían conectarse con el término de búsqueda original. Presenta tu análisis como una revelación profunda y significativa en español. Sé poético pero claro.`,
});


// --- MAIN FLOW ---

export const runTorahCodeAnalysis = ai.defineFlow(
  {
    name: 'runTorahCodeAnalysisFlow',
    inputSchema: TorahCodeInputSchema,
    outputSchema: AnalysisResultSchema,
  },
  async ({ searchTerm }) => {
    // 1. Translate and get optimal skip from AI
    const { output: translation } = await translationPrompt({ searchTerm });
    if (!translation) {
      throw new Error("La IA no pudo traducir el término o definir una ecuación de salto.");
    }
    const { hebrewTerm, optimalSkip } = translation;

    // 2. Search for the ELS in the Torah text
    const startIndex = findELS(TORAH_TEXT, hebrewTerm, optimalSkip);
    if (startIndex === -1) {
      // Optional: Could add a retry loop with different skips here
      throw new Error(`El término '${hebrewTerm}' no fue encontrado con el salto profetizado de ${optimalSkip}.`);
    }

    // 3. Extract the surrounding matrix
    const matrix = extractMatrix(TORAH_TEXT, startIndex, optimalSkip, hebrewTerm.length);

    // 4. Get the revelation from the AI
    const matrixString = matrix.map(row => row.join(' ')).join('\n');
    const { output: revelation } = await revelationPrompt({ searchTerm, hebrewTerm, matrix: matrixString });
    if (!revelation) {
        throw new Error("El Oráculo no pudo generar una revelación para la matriz encontrada.");
    }
    
    // 5. Assemble and return the final result
    return {
      searchTerm,
      hebrewTerm,
      foundTerm: hebrewTerm,
      skip: optimalSkip,
      startIndex,
      matrix,
      revelation: revelation.revelation,
    };
  }
);

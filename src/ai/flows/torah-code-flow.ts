
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

const CryptographicTermSchema = z.object({
  hebrewTerm: z.string().describe('El término de búsqueda en hebreo, sin vocales ni puntuación.'),
  explanation: z.string().describe('Una breve explicación de cómo se derivó este término (fonético, gematria, etc.).'),
  skipEquation: z.number().int().min(1).describe('La distancia de salto (skip) que la IA considera óptima para este término específico.'),
});

const CryptographicDesignOutputSchema = z.object({
  searchTerms: z.array(CryptographicTermSchema).describe('Una lista de posibles términos hebreos a buscar, cada uno con su propia ecuación de salto.'),
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
  if (skip === 0) return -1;
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

const cryptographicDesignPrompt = ai.definePrompt({
    name: 'cryptographicDesignPrompt',
    input: { schema: TorahCodeInputSchema },
    output: { schema: CryptographicDesignOutputSchema },
    prompt: `Eres un rabino cabalista, un maestro de la Gematria (el valor numérico de las letras hebreas) y el Notarikon (el uso de iniciales). Tu tarea es tomar un término de búsqueda moderno y diseñar un conjunto de términos de búsqueda en hebreo antiguo y "ecuaciones de salto" para encontrarlo codificado en la Torá.

Término de búsqueda: "{{{searchTerm}}}"

Sigue estos pasos:
1.  **Analiza el Término:** ¿Es un nombre propio, un concepto, un evento?
2.  **Genera un Conjunto de Búsqueda (3-5 opciones):** Crea una lista de posibles términos hebreos (sin vocales) para buscar. Sé creativo y místico. No te limites a la traducción literal.
    *   **Traducción Fonética:** ¿Cómo sonaría el término en hebreo? (Ej: "Donald Trump" -> "דנלד טרמפ")
    *   **Equivalencia por Gematria:** Calcula el valor numérico del término en español/inglés (A=1, B=2...) y encuentra una palabra o frase hebrea con un valor de Gematria similar que sea conceptualmente relevante.
    *   **Notarikon/Acrónimo:** Si es una frase, usa las iniciales para formar una nueva palabra.
    *   **Concepto Relacionado:** ¿Qué concepto o figura bíblica se relaciona con el término? (Ej: para "éxito", podrías buscar "bendición" - "ברכה").
3.  **Diseña la Ecuación de Salto:** Para CADA término hebreo que generes, asigna un número de salto (skip) que sea numerológicamente significativo. Piensa en fechas, números bíblicos importantes, o la propia gematria del término.
4.  **Proporciona una Explicación:** Para cada término, explica brevemente por qué lo elegiste (ej: "Traducción fonética", "Gematria de 777, que representa la perfección divina").

Genera una lista de al menos 3 opciones de búsqueda.`,
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
    // 1. Get a list of cryptographic search terms and skip equations from the AI
    const { output: design } = await cryptographicDesignPrompt({ searchTerm });
    if (!design || !design.searchTerms || design.searchTerms.length === 0) {
      throw new Error("La IA no pudo diseñar una estrategia criptográfica para este término.");
    }
    const { searchTerms } = design;

    // 2. Iterate through the AI's suggested terms and search for an ELS
    let startIndex = -1;
    let foundSkip = -1;
    let foundTerm = '';
    let foundExplanation = '';

    for (const term of searchTerms) {
        // First, try the AI's "prophesied" skip
        startIndex = findELS(TORAH_TEXT, term.hebrewTerm, term.skipEquation);
        if (startIndex !== -1) {
            foundTerm = term.hebrewTerm;
            foundSkip = term.skipEquation;
            foundExplanation = term.explanation;
            break; // Found a match, exit the loop
        }
    }
    
    // If no match was found with the AI's specific skips, do a broad search
    if (startIndex === -1) {
        const MAX_SKIP = 50000;
        // Iterate through each suggested term again for a broad search
        for (const term of searchTerms) {
            // Now, iterate through a wide range of skips for this term
            for (let skip = 1; skip <= MAX_SKIP; skip++) {
                 // Skip the one we already tried for this term
                if (skip === term.skipEquation) continue;
                
                const index = findELS(TORAH_TEXT, term.hebrewTerm, skip);
                if (index !== -1) {
                    startIndex = index;
                    foundTerm = term.hebrewTerm;
                    foundSkip = skip;
                    foundExplanation = `Búsqueda amplia. Original: ${term.explanation}`;
                    break; // Stop at the first find
                }
            }
            if (startIndex !== -1) {
                break; // Found a match, exit the outer loop
            }
        }
    }


    if (startIndex === -1) {
      throw new Error(`El término '${searchTerm}' no fue encontrado en la Torá con un rango de búsqueda amplio.`);
    }

    // 3. Extract the surrounding matrix
    const matrix = extractMatrix(TORAH_TEXT, startIndex, foundSkip, foundTerm.length);

    // 4. Get the revelation from the AI
    const matrixString = matrix.map(row => row.join(' ')).join('\n');
    const { output: revelation } = await revelationPrompt({ searchTerm, hebrewTerm: foundTerm, matrix: matrixString });
    if (!revelation) {
        throw new Error("El Oráculo no pudo generar una revelación para la matriz encontrada.");
    }
    
    // 5. Assemble and return the final result
    return {
      searchTerm,
      hebrewTerm: foundTerm,
      foundTerm: foundTerm,
      skip: foundSkip,
      startIndex,
      matrix,
      revelation: revelation.revelation,
    };
  }
);


'use server';
/**
 * @fileOverview An AI flow for finding and interpreting "Bible Codes" in the Torah.
 *
 * - runTorahCodeAnalysis: The main flow orchestrator.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { TORAH_TEXT } from '@/lib/torah-text';
import type { TorahCodeAnalysis, TorahRevelation } from '@/lib/types';

// --- SCHEMA DEFINITIONS ---

const TorahCodeInputSchema = z.object({
  searchTerm: z.string().describe('El término o concepto que el usuario quiere buscar en la Torá, en español.'),
});

const CryptographicTermSchema = z.object({
  hebrewTerm: z.string().describe('Un término hebreo existente y relevante (sin vocales) que se relaciona conceptualmente con la búsqueda.'),
  explanation: z.string().describe('Una breve explicación de por qué este término hebreo real se relaciona con la búsqueda original.'),
  skipEquation: z.number().int().min(1).describe('La distancia de salto (skip) que la IA considera óptima para este término específico.'),
});

const CryptographicDesignOutputSchema = z.object({
  searchTerms: z.array(CryptographicTermSchema).describe('Una lista de términos hebreos conceptualmente relacionados para buscar, cada uno con su propia ecuación de salto.'),
});


const PastRevelationSchema = z.object({
    title: z.string().describe("Un título para la sección, como 'El Eco del Pasado' o 'La Semilla Histórica'."),
    analysis: z.string().describe("Un análisis que conecta el concepto encontrado con eventos históricos o pasajes bíblicos conocidos. Debe explicar el origen o la causa primera del concepto según los patrones de la matriz."),
});

const PresentRevelationSchema = z.object({
    title: z.string().describe("Un título para la sección, como 'El Reflejo en el Ahora' o 'El Espejo del Presente'."),
    analysis: z.string().describe("Una interpretación del significado y las implicaciones del concepto en el contexto actual. Debe analizar las fuerzas en juego, los conflictos y las energías que rodean al término hoy, desde una perspectiva simbólica y psicológica."),
});

const FutureRevelationSchema = z.object({
    title: z.string().describe("Un título para la sección, como 'La Sombra del Porvenir' o 'El Sendero Futuro'."),
    analysis: z.string().describe("Una extrapolación de una o varias posibles trayectorias futuras basadas en los patrones de la matriz, presentada como una visión, advertencia o consejo espiritual."),
});


const RevelationOutputSchema = z.object({
    overallTitle: z.string().describe("Un título poético y evocador para la revelación completa."),
    context: z.string().describe("Una breve explicación del término de búsqueda, el término hebreo encontrado y la distancia de salto utilizada."),
    gematriaConnection: z.string().describe("Una explicación del valor de Gematria del término encontrado y su conexión con otros conceptos bíblicos."),
    reflection: z.string().describe("Una pregunta final, poderosa y abierta, para la reflexión del usuario."),
    past: PastRevelationSchema,
    present: PresentRevelationSchema,
    future: FutureRevelationSchema,
});

const AnalysisResultSchema = z.object({
  foundTerm: z.string().describe('El término hebreo encontrado.'),
  skip: z.number().int().describe('El salto utilizado para encontrar el término.'),
  startIndex: z.number().int().describe('El índice de inicio donde se encontró la primera letra del término.'),
  matrix: z.array(z.array(z.string())).describe('Una matriz de 21x21 de letras hebreas centrada en el término encontrado.'),
  revelation: RevelationOutputSchema.describe('Una interpretación perspicaz de la matriz, explicando las palabras cruzadas y su posible significado contextual, traducido al español.'),
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
    prompt: `Eres un rabino cabalista y un maestro de la Gematria. Tu tarea es tomar un término de búsqueda moderno y diseñar un conjunto de búsquedas para encontrarlo codificado conceptualmente en la Torá.

**CRÍTICO: NO inventes palabras en hebreo. NO hagas traducciones fonéticas literales. En su lugar, encuentra conceptos o palabras hebreas REALES que existan en la Biblia y que se relacionen con la idea de la búsqueda.**

Término de búsqueda: "{{{searchTerm}}}"

Sigue estos pasos:
1.  **Analiza el Concepto:** ¿Cuál es la esencia del término? Si es "Donald Trump", la esencia podría ser "líder poderoso", "constructor", "hombre rico", "presidente", "casa grande". Si es "internet", podría ser "red", "conexión mundial", "sabiduría infinita".
2.  **Genera un Conjunto de Búsqueda (3-5 opciones):** Para cada concepto esencial, encuentra una palabra o frase hebrea **real y existente** (sin vocales).
    *   Ejemplo para "Donald Trump": Podrías buscar "מלך" (rey), "נשיא" (presidente), "איש עשיר" (hombre rico).
    *   Ejemplo para "éxito": Podrías buscar "ברכה" (bendición), "הצלחה" (prosperidad).
3.  **Diseña la Ecuación de Salto:** Para CADA término hebreo que generes, asigna un número de salto (skip) que sea numerológicamente significativo. Piensa en fechas, números bíblicos importantes, o la propia gematria del término.
4.  **Proporciona una Explicación:** Para cada término, explica brevemente por qué elegiste este concepto hebreo real para representar la búsqueda original.

Genera una lista de al menos 3 opciones de búsqueda conceptual.`,
});


const revelationPrompt = ai.definePrompt({
    name: 'torahCodeRevelationPrompt',
    input: { schema: z.object({
        searchTerm: z.string(),
        hebrewTerm: z.string(),
        skip: z.number(),
        matrix: z.string(), // The matrix stringified
    })},
    output: { schema: RevelationOutputSchema },
    prompt: `Eres un erudito cabalista, un psicólogo junguiano y un vidente. Has descubierto una matriz de letras en la Torá alrededor de la palabra clave "{{hebrewTerm}}" (que se relaciona con el concepto de "{{searchTerm}}").

Tu tarea es generar una revelación profunda y multifacética, un tríptico que abarque pasado, presente y futuro, tejiendo lo histórico con lo simbólico y lo espiritual.

**ESTRUCTURA DE SALIDA OBLIGATORIA (JSON):**

1.  **overallTitle**: Genera un título poético y evocador para la revelación completa.
2.  **context**: Explica claramente que la búsqueda de \`{{searchTerm}}\` llevó al término hebreo \`{{hebrewTerm}}\`, encontrado con una distancia de salto de \`{{skip}}\`.

3.  **past (El Historiador)**: Un objeto con:
    *   \`title\`: "El Eco del Pasado" o un título evocador similar.
    *   \`analysis\`: Realiza un análisis histórico-narrativo. Conecta la matriz con eventos o pasajes bíblicos conocidos. Busca el origen, la "semilla" del concepto en la historia sagrada.

4.  **present (El Psicólogo Simbólico)**: Un objeto con:
    *   \`title\`: "El Espejo del Presente" o similar.
    *   \`analysis\`: Interpreta el significado para el "ahora". Analiza las palabras cruzadas en la matriz y su implicación simbólica y psicológica. ¿Qué arquetipos están en juego? ¿Qué conflicto interno revela?

5.  **future (El Profeta Espiritual)**: Un objeto con:
    *   \`title\`: "La Sombra del Porvenir" o similar.
    *   \`analysis\`: Ofrece una proyección y un consejo. Basándote en los patrones, extrapola una posible trayectoria futura. Preséntalo como una visión o advertencia. Luego, destila un consejo esotérico o espiritual basado en toda la revelación.

6.  **gematriaConnection**: Calcula el valor numérico (Gematria) de \`{{hebrewTerm}}\`. Encuentra al menos 1-2 otras palabras hebreas significativas con el mismo valor y explica la conexión mística entre ellas de forma elocuente.

7.  **reflection**: Concluye con una única pregunta final, poderosa y abierta, para la reflexión del usuario.

---
**CRÍTICO:** Analiza la matriz a fondo. Busca palabras en horizontal (derecha a izquierda), vertical y diagonal. Sé poético, profundo y claro.
---

**Matriz de Letras a Analizar:**
{{{matrix}}}

Genera el objeto JSON completo con los campos solicitados.`,
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

    // Use the originally requested term for the error message, but reference the tried Hebrew terms.
    if (startIndex === -1) {
      const triedTerms = searchTerms.map(t => t.hebrewTerm).join(', ');
      throw new Error(`No se encontraron conexiones para '${searchTerm}' en la Torá (se intentó con los conceptos: ${triedTerms}).`);
    }

    // 3. Extract the surrounding matrix
    const matrix = extractMatrix(TORAH_TEXT, startIndex, foundSkip, foundTerm.length);

    // 4. Get the revelation from the AI
    const matrixString = matrix.map(row => row.join(' ')).join('\n');
    const { output: revelation } = await revelationPrompt({ searchTerm, hebrewTerm: foundTerm, skip: foundSkip, matrix: matrixString });
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
      revelation,
    };
  }
);

    
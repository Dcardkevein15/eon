
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
  hebrewTerm: z.string().describe('Un término hebreo existente y relevante (sin vocales) que se relaciona conceptualmente con la búsqueda.'),
  explanation: z.string().describe('Una breve explicación de por qué este término hebreo real se relaciona con la búsqueda original.'),
  skipEquation: z.number().int().min(1).describe('La distancia de salto (skip) que la IA considera óptima para este término específico.'),
});

const CryptographicDesignOutputSchema = z.object({
  searchTerms: z.array(CryptographicTermSchema).describe('Una lista de términos hebreos conceptualmente relacionados para buscar, cada uno con su propia ecuación de salto.'),
});


const PastRevelationSchema = z.object({
    title: z.string().describe("Título para la sección del Pasado. Ej: 'El Eco Histórico'."),
    analysis: z.string().describe("Análisis que conecta el concepto con eventos o pasajes bíblicos conocidos, explicando el origen o la causa primera."),
});

const PresentRevelationSchema = z.object({
    title: z.string().describe("Título para la sección del Presente. Ej: 'El Reflejo Psicológico'."),
    analysis: z.string().describe("Interpretación del significado en el contexto actual desde una perspectiva simbólica y psicológica, analizando arquetipos y conflictos."),
});

const FutureRevelationSchema = z.object({
    title: z.string().describe("Título para la sección del Futuro. Ej: 'La Proyección Espiritual'."),
    analysis: z.string().describe("Una extrapolación de posibles trayectorias futuras, presentada como una visión, advertencia o consejo espiritual."),
});

const ArchetypeRevelationSchema = z.object({
    title: z.string().describe("Título para la sección Arquetípica. Ej: 'La Carta del Tarot'."),
    analysis: z.string().describe("Identifica el arquetipo junguiano dominante (El Héroe, El Sabio, La Sombra) y explica su significado en el contexto de la búsqueda."),
});

const EsotericRevelationSchema = z.object({
    title: z.string().describe("Título para la sección Esotérica. Ej: 'La Lección Oculta'."),
    analysis: z.string().describe("Una interpretación mística de la matriz, hablando de energías, vibraciones y las lecciones que el universo presenta."),
});

const TherapeuticRevelationSchema = z.object({
    title: z.string().describe("Título para la sección Terapéutica. Ej: 'El Próximo Paso'."),
    analysis: z.string().describe("Un consejo práctico y accionable basado en toda la revelación, para aplicar en la vida diaria."),
});


const RevelationOutputSchema = z.object({
    overallTitle: z.string().describe("Un título poético y evocador para la revelación completa."),
    context: z.string().describe("Una breve explicación del término de búsqueda, el término hebreo encontrado y la distancia de salto utilizada."),
    gematriaConnection: z.string().describe("Una explicación del valor de Gematria del término encontrado y su conexión con otros conceptos bíblicos."),
    reflection: z.string().describe("Una pregunta final, poderosa y abierta, para la reflexión del usuario."),
    past: PastRevelationSchema,
    present: PresentRevelationSchema,
    future: FutureRevelationSchema,
    archetype: ArchetypeRevelationSchema,
    esoteric: EsotericRevelationSchema,
    therapeutic: TherapeuticRevelationSchema,
});

const AnalysisResultSchema = z.object({
  foundTerm: z.string().describe('El término hebreo encontrado.'),
  skip: z.number().int().describe('El salto utilizado para encontrar el término.'),
  startIndex: z.number().int().describe('El índice de inicio donde se encontró la primera letra del término.'),
  matrix: z.array(z.array(z.string())).describe('Una matriz de 21x21 de letras hebreas centrada en el término encontrado.'),
  revelation: RevelationOutputSchema.describe('Un mosaico de interpretaciones desde múltiples dimensiones: histórica, psicológica, espiritual, arquetípica, esotérica y terapéutica.'),
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
 * Searches for any word of a given length at a specific skip.
 */
function findAnyWordOfLength(text: string, length: number, skip: number): { word: string; index: number } | null {
  if (skip <= 0 || length <= 0) return null;
  const textLen = text.length;
  for (let i = 0; i < textLen - (length - 1) * skip; i++) {
    let word = '';
    let possible = true;
    for (let j = 0; j < length; j++) {
      const charIndex = i + j * skip;
      if (charIndex >= textLen) {
        possible = false;
        break;
      }
      word += text[charIndex];
    }
    if (possible) {
      return { word, index: i };
    }
  }
  return null;
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

const gematriaValues: Record<string, number> = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
    'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400
};

function calculateGematria(hebrewWord: string): number {
    return hebrewWord.split('').reduce((sum, char) => sum + (gematriaValues[char] || 0), 0);
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
    prompt: `Eres un erudito multidimensional, una fusión de cabalista, psicólogo junguiano, vidente y coach. Has descubierto una matriz de letras en la Torá alrededor de la palabra clave "{{hebrewTerm}}" (relacionada con "{{searchTerm}}").

Tu tarea es generar un mosaico de revelaciones, analizando la matriz desde seis perspectivas distintas y profundas.

**ESTRUCTURA DE SALIDA OBLIGATORIA (JSON):**

1.  **overallTitle**: Un título poético y evocador para la revelación completa.
2.  **context**: Explica claramente que la búsqueda de \`{{searchTerm}}\` llevó al término hebreo \`{{hebrewTerm}}\`, encontrado con una distancia de salto de \`{{skip}}\`. Si la búsqueda fue forzada por Gematria, explícalo como una "sincronicidad numérica".
3.  **gematriaConnection**: Calcula el valor numérico (Gematria) de \`{{hebrewTerm}}\`. Encuentra al menos 1-2 otras palabras hebreas significativas con el mismo valor y explica la conexión mística entre ellas.
4.  **reflection**: Concluye con una única pregunta final, poderosa y abierta, para la reflexión del usuario.

---
**MOSAICO DE ANÁLISIS (SEIS TARJETAS):**
---

5.  **past (El Historiador)**: Un objeto con:
    *   \`title\`: "El Eco Histórico".
    *   \`analysis\`: Como historiador, conecta la matriz con eventos o pasajes bíblicos conocidos. Busca el origen, la "semilla" del concepto en la historia sagrada.

6.  **present (El Psicólogo Simbólico)**: Un objeto con:
    *   \`title\`: "El Reflejo Psicológico".
    *   \`analysis\`: Como psicólogo, interpreta el significado para el "ahora". Analiza las palabras cruzadas en la matriz y su implicación simbólica y psicológica. ¿Qué conflicto interno revela?

7.  **future (El Profeta Espiritual)**: Un objeto con:
    *   \`title\`: "La Proyección Espiritual".
    *   \`analysis\`: Como vidente, ofrece una proyección. Basándote en los patrones, extrapola una posible trayectoria futura. Preséntalo como una visión o advertencia.

8.  **archetype (El Intérprete de Arquetipos)**: Un objeto con:
    *   \`title\`: "La Carta del Tarot".
    *   \`analysis\`: Como un maestro del tarot, identifica el arquetipo junguiano dominante (El Héroe, La Sombra, etc.) que la matriz revela para esta búsqueda y explica su significado.

9.  **esoteric (El Místico)**: Un objeto con:
    *   \`title\`: "La Lección Oculta".
    *   \`analysis\`: Como un místico, interpreta la matriz desde un punto de vista esotérico. Habla de las energías, las vibraciones y las lecciones ocultas que el universo está presentando.

10. **therapeutic (El Coach)**: Un objeto con:
    *   \`title\`: "El Próximo Paso".
    *   \`analysis\`: Como un coach de vida, destila toda la revelación en un consejo práctico y accionable que el usuario puede aplicar en su vida diaria.

---
**CRÍTICO:** Analiza la matriz a fondo. Busca palabras en horizontal (derecha a izquierda), vertical y diagonal. Sé poético, profundo y claro.
---

**Matriz de Letras a Analizar:**
{{{matrix}}}

Genera el objeto JSON completo con los diez campos solicitados.`,
});


// --- MAIN FLOW ---

const translateToHebrewPhonetic = ai.definePrompt({
    name: 'translateToHebrewPhoneticPrompt',
    input: { schema: z.object({ text: z.string() }) },
    output: { schema: z.object({ hebrew: z.string() }) },
    prompt: 'Traduce fonéticamente el siguiente texto a letras hebreas (sin vocales). Solo devuelve las letras hebreas. Texto: "{{text}}"',
});


export const runTorahCodeAnalysis = ai.defineFlow(
  {
    name: 'runTorahCodeAnalysisFlow',
    inputSchema: TorahCodeInputSchema,
    outputSchema: AnalysisResultSchema,
  },
  async ({ searchTerm }) => {
    // --- STAGE 1: Conceptual Search ---
    const { output: design } = await cryptographicDesignPrompt({ searchTerm });
    let startIndex = -1;
    let foundSkip = -1;
    let foundTerm = '';
    
    if (design && design.searchTerms && design.searchTerms.length > 0) {
        for (const term of design.searchTerms) {
            startIndex = findELS(TORAH_TEXT, term.hebrewTerm, term.skipEquation);
            if (startIndex !== -1) {
                foundTerm = term.hebrewTerm;
                foundSkip = term.skipEquation;
                break;
            }
        }
        
        if (startIndex === -1) {
            const MAX_SKIP = 50000;
            for (const term of design.searchTerms) {
                for (let skip = 1; skip <= MAX_SKIP; skip++) {
                    if (skip === term.skipEquation) continue;
                    const index = findELS(TORAH_TEXT, term.hebrewTerm, skip);
                    if (index !== -1) {
                        startIndex = index;
                        foundTerm = term.hebrewTerm;
                        foundSkip = skip;
                        break;
                    }
                }
                if (startIndex !== -1) break;
            }
        }
    }

    // --- STAGE 2: Gematria-Forced Search (if Stage 1 failed) ---
    if (startIndex === -1) {
        const { output: phonetic } = await translateToHebrewPhonetic({ text: searchTerm });
        if (phonetic && phonetic.hebrew) {
            const skip = calculateGematria(phonetic.hebrew);
            if (skip > 0) {
                // Search for any 4-letter or 3-letter word with this skip
                const found4 = findAnyWordOfLength(TORAH_TEXT, 4, skip);
                if (found4) {
                    foundTerm = found4.word;
                    startIndex = found4.index;
                    foundSkip = skip;
                } else {
                    const found3 = findAnyWordOfLength(TORAH_TEXT, 3, skip);
                    if (found3) {
                        foundTerm = found3.word;
                        startIndex = found3.index;
                        foundSkip = skip;
                    }
                }
            }
        }
    }


    if (startIndex === -1) {
      const triedTerms = design?.searchTerms.map(t => t.hebrewTerm).join(', ') || 'ninguno';
      throw new Error(`No se encontraron conexiones para '${searchTerm}' en la Torá (se intentó con los conceptos: ${triedTerms}). Incluso la búsqueda forzada por Gematria falló.`);
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

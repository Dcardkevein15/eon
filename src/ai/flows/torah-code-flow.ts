
'use server';
/**
 * @fileOverview El Oráculo de Resonancia Conceptual: una evolución del código de la Torá.
 * Este flujo no busca un término, sino la intersección de dos, para descifrar las leyes universales que los conectan.
 *
 * - runTorahCodeAnalysis: El orquestador principal del flujo.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { TORAH_TEXT } from '@/lib/torah-text';
import type { TorahCodeAnalysis } from '@/lib/types';

// --- SCHEMA DEFINITIONS ---

const TorahCodeInputSchema = z.object({
  conceptA: z.string().describe('El primer concepto para el análisis de resonancia.'),
  conceptB: z.string().describe('El segundo concepto para el análisis de resonancia.'),
});

const CryptographicTermSchema = z.object({
  hebrewTerm: z.string().describe('Un término hebreo existente y relevante (sin vocales) que se relaciona conceptualmente con la búsqueda.'),
  explanation: z.string().describe('Una breve explicación de por qué este término hebreo real se relaciona con la búsqueda original.'),
  skipEquation: z.number().int().min(1).describe('La distancia de salto (skip) que la IA considera óptima para este término específico.'),
});

const CryptographicDesignOutputSchema = z.object({
  searchTermsA: z.array(CryptographicTermSchema).describe('Lista de términos hebreos para el Concepto A.'),
  searchTermsB: z.array(CryptographicTermSchema).describe('Lista de términos hebreos para el Concepto B.'),
});

// Schemas para el mosaico de revelaciones
const PastRevelationSchema = z.object({
    title: z.string().describe("Título para la sección del Pasado. Ej: 'El Eco Histórico'."),
    analysis: z.string().describe("Análisis que conecta la intersección con eventos o pasajes bíblicos conocidos."),
});
const PresentRevelationSchema = z.object({
    title: z.string().describe("Título para la sección del Presente. Ej: 'El Reflejo Psicológico'."),
    analysis: z.string().describe("Interpretación del significado en el contexto actual desde una perspectiva simbólica y psicológica."),
});
const FutureRevelationSchema = z.object({
    title: z.string().describe("Título para la sección del Futuro. Ej: 'La Proyección Espiritual'."),
    analysis: z.string().describe("Una extrapolación de posibles trayectorias futuras, presentada como una visión o advertencia."),
});
const ArchetypeRevelationSchema = z.object({
    title: z.string().describe("Título para la sección Arquetípica. Ej: 'La Carta del Tarot'."),
    analysis: z.string().describe("Identifica el arquetipo junguiano dominante que emerge de la intersección y explica su significado."),
});
const EsotericRevelationSchema = z.object({
    title: z.string().describe("Título para la sección Esotérica. Ej: 'La Lección Oculta'."),
    analysis: z.string().describe("Una interpretación mística de la matriz, hablando de energías, vibraciones y las lecciones universales."),
});
const TherapeuticRevelationSchema = z.object({
    title: z.string().describe("Título para la sección Terapéutica. Ej: 'El Próximo Paso'."),
    analysis: z.string().describe("Un consejo práctico y accionable basado en toda la revelación, para aplicar en la vida diaria."),
});
const PropheticRevelationSchema = z.object({
    title: z.string().describe("Título para la dimensión profética. Ej: 'La Arquitectura de la Realidad'."),
    analysis: z.string().describe("Explica la ley universal o principio cósmico que la intersección de los dos conceptos revela sobre la propia construcción de la realidad."),
});


const RevelationOutputSchema = z.object({
    overallTitle: z.string().describe("Un título poético y evocador para la revelación completa."),
    context: z.string().describe("Explicación de los términos y saltos encontrados para ambos conceptos."),
    gematriaConnection: z.string().describe("Análisis de la Gematria de ambos términos y su conexión mística."),
    reflection: z.string().describe("Una pregunta final, poderosa y abierta, para la reflexión del usuario."),
    past: PastRevelationSchema,
    present: PresentRevelationSchema,
    future: FutureRevelationSchema,
    archetype: ArchetypeRevelationSchema,
    esoteric: EsotericRevelationSchema,
    therapeutic: TherapeuticRevelationSchema,
    prophetic: PropheticRevelationSchema,
});

const AnalysisResultSchema = z.object({
  foundTerm: z.string(), // Mantengo este campo, ahora puede representar la intersección.
  skip: z.number().int(), // Puede representar el salto del término principal.
  startIndex: z.number().int(), // Puede representar el índice del término principal.
  matrix: z.array(z.array(z.string())).describe('Una matriz de 21x21 de letras hebreas centrada en la intersección.'),
  revelation: RevelationOutputSchema,
});


// --- HELPER FUNCTIONS ---

type ELSResult = {
    term: string;
    skip: number;
    indices: number[];
};

function findELS(text: string, word: string, skip: number): number[] {
  if (skip === 0) return [];
  const indices: number[] = [];
  const textLen = text.length;

  for (let i = 0; i < textLen - (word.length - 1) * skip; i++) {
    let found = true;
    const currentIndices: number[] = [];
    for (let j = 0; j < word.length; j++) {
      const nextCharIndex = i + j * skip;
      if (nextCharIndex >= textLen || text[nextCharIndex] !== word[j]) {
        found = false;
        break;
      }
      currentIndices.push(nextCharIndex);
    }
    if (found) {
      indices.push(...currentIndices); // Por ahora, devolvemos todos los índices de todas las apariciones
    }
  }
  return indices;
}


function findClosestIntersection(resultsA: ELSResult[], resultsB: ELSResult[]): {a: ELSResult, b: ELSResult, intersectionIndex: number, distance: number} | null {
    let closestPair = null;
    let minDistance = Infinity;

    for (const resA of resultsA) {
        for (const resB of resultsB) {
            const indicesA = new Set(resA.indices);
            for (const indexB of resB.indices) {
                if (indicesA.has(indexB)) {
                    // Cruce exacto, la mejor opción.
                    return { a: resA, b: resB, intersectionIndex: indexB, distance: 0 };
                }
            }
            
            // Si no hay cruce exacto, buscar la menor distancia.
            for (const indexA of resA.indices) {
                for (const indexB of resB.indices) {
                    const distance = Math.abs(indexA - indexB);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestPair = { a: resA, b: resB, intersectionIndex: Math.floor((indexA + indexB) / 2), distance };
                    }
                }
            }
        }
    }
    return closestPair;
}


function extractMatrixFromIndex(text: string, centerIndex: number, size: number = 21): string[][] {
    const matrix: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));
    const center = Math.floor(size / 2);

    const matrixStartIndex = centerIndex - (center * size) - center;

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

// Gematria and other helpers remain unchanged.


// --- AI PROMPTS ---

const cryptographicDesignPrompt = ai.definePrompt({
    name: 'cryptographicDesignPrompt',
    input: { schema: TorahCodeInputSchema },
    output: { schema: CryptographicDesignOutputSchema },
    prompt: `Eres un rabino cabalista experto. Tu tarea es tomar dos conceptos y diseñar conjuntos de búsqueda para encontrar su resonancia en la Torá.

**CRÍTICO: NO inventes palabras en hebreo. Usa solo conceptos o palabras hebreas REALES que existan en la Biblia.**

**Concepto A:** "{{{conceptA}}}"
**Concepto B:** "{{{conceptB}}}"

Para cada concepto:
1.  **Analiza la Esencia:** ¿Cuál es el núcleo del concepto?
2.  **Genera un Conjunto de Búsqueda:** Encuentra 3-5 palabras o frases hebreas **reales** (sin vocales) que se relacionen con esa esencia.
3.  **Diseña Ecuaciones de Salto:** Para CADA término hebreo, asigna un número de salto (skip) que sea numerológicamente significativo (Gematria, fechas, etc.).
4.  **Proporciona una Explicación:** Justifica brevemente la elección de cada término hebreo.

Genera las listas para `searchTermsA` y `searchTermsB`.`,
});


const revelationPrompt = ai.definePrompt({
    name: 'torahCodeRevelationPrompt',
    input: { schema: z.object({
        conceptA: z.string(),
        conceptB: z.string(),
        hebrewTermA: z.string(),
        hebrewTermB: z.string(),
        skipA: z.number(),
        skipB: z.number(),
        matrix: z.string(), // The matrix stringified
    })},
    output: { schema: RevelationOutputSchema },
    prompt: `Eres un Oráculo multidimensional: una fusión de cabalista, psicólogo junguiano, vidente, y arquitecto de la realidad. Has descubierto una intersección en la Torá donde resuenan los conceptos de "{{conceptA}}" (como "{{hebrewTermA}}") y "{{conceptB}}" (como "{{hebrewTermB}}").

Tu tarea es generar un mosaico de revelaciones, analizando la matriz de su intersección desde siete perspectivas distintas y profundas.

**ESTRUCTURA DE SALIDA OBLIGATORIA (JSON):**

1.  **overallTitle**: Un título poético y evocador para la revelación completa.
2.  **context**: Explica la resonancia encontrada: la búsqueda de "{{conceptA}}" y "{{conceptB}}" llevó a la intersección de "{{hebrewTermA}}" (salto {{skipA}}) y "{{hebrewTermB}}" (salto {{skipB}}).
3.  **gematriaConnection**: Calcula el valor de Gematria de **ambos** términos hebreos. Explica la conexión mística entre ellos y con otros conceptos bíblicos que compartan esos valores.
4.  **reflection**: Concluye con una única pregunta final, poderosa y abierta, para la reflexión del usuario.

---
**MOSAICO DE ANÁLISIS (SIETE TARJETAS):**
---

5.  **past (El Historiador)**: Objeto con \`title\` y \`analysis\`. Conecta la intersección con eventos o pasajes bíblicos.
6.  **present (El Psicólogo Simbólico)**: Objeto con \`title\` y \`analysis\`. Interpreta el significado para el "ahora", analizando el conflicto simbólico y psicológico que la colisión de conceptos revela.
7.  **future (El Profeta Espiritual)**: Objeto con \`title\` y \`analysis\`. Ofrece una proyección futura basada en los patrones. Preséntalo como una visión o advertencia.
8.  **archetype (El Intérprete de Arquetipos)**: Objeto con \`title\` y \`analysis\`. Identifica el arquetipo junguiano dominante que emerge de la intersección.
9.  **esoteric (El Místico)**: Objeto con \`title\` y \`analysis\`. Interpreta la matriz desde un punto de vista de energías, vibraciones y lecciones universales.
10. **therapeutic (El Coach)**: Objeto con \`title\` y \`analysis\`. Destila toda la revelación en un consejo práctico y accionable.
11. **prophetic (El Arquitecto de la Realidad)**: Objeto con \`title\` y \`analysis\`. Esta es la revelación más importante. Explica **la ley universal o el principio cósmico fundamental** que la intersección de estos dos conceptos revela sobre la propia construcción de la realidad. ¿Cuál es el 'mecanismo de relojería' que conecta estas dos fuerzas a nivel de creación?

---
**CRÍTICO:** Analiza la matriz a fondo. Busca palabras cruzadas. Sé poético, profundo y claro.
---

**Matriz de Intersección a Analizar:**
{{{matrix}}}

Genera el objeto JSON completo con los once campos solicitados.`,
});


// --- MAIN FLOW ---

export const runTorahCodeAnalysis = ai.defineFlow(
  {
    name: 'runTorahCodeAnalysisFlow',
    inputSchema: TorahCodeInputSchema,
    outputSchema: AnalysisResultSchema,
  },
  async ({ conceptA, conceptB }) => {
    // --- STAGE 1: Conceptual Search Design ---
    const { output: design } = await cryptographicDesignPrompt({ conceptA, conceptB });
    if (!design || !design.searchTermsA.length || !design.searchTermsB.length) {
      throw new Error("La IA no pudo diseñar términos de búsqueda para los conceptos dados.");
    }
    
    // --- STAGE 2: Exhaustive ELS Search for all terms ---
    const MAX_SKIP = 5000; // Reducido para un rendimiento razonable.
    const searchTasksA = design.searchTermsA.map(term => 
        findELS(TORAH_TEXT, term.hebrewTerm, term.skipEquation).length > 0
            ? Promise.resolve({ term: term.hebrewTerm, skip: term.skipEquation, indices: findELS(TORAH_TEXT, term.hebrewTerm, term.skipEquation) })
            : Promise.resolve(null)
    );

    const searchTasksB = design.searchTermsB.map(term =>
        findELS(TORAH_TEXT, term.hebrewTerm, term.skipEquation).length > 0
            ? Promise.resolve({ term: term.hebrewTerm, skip: term.skipEquation, indices: findELS(TORAH_TEXT, term.hebrewTerm, term.skipEquation) })
            : Promise.resolve(null)
    );

    const resultsA = (await Promise.all(searchTasksA)).filter((r): r is ELSResult => r !== null);
    const resultsB = (await Promise.all(searchTasksB)).filter((r): r is ELSResult => r !== null);

    if (resultsA.length === 0 || resultsB.length === 0) {
        throw new Error(`No se encontraron secuencias en la Torá para uno o ambos conceptos. Concepto A: ${resultsA.length > 0}, Concepto B: ${resultsB.length > 0}`);
    }

    // --- STAGE 3: Find Intersection ---
    const intersection = findClosestIntersection(resultsA, resultsB);

    if (!intersection) {
      throw new Error(`No se encontró una resonancia o intersección clara entre '${conceptA}' y '${conceptB}' con los términos buscados.`);
    }

    // --- STAGE 4: Extract Matrix and Get Revelation ---
    const matrix = extractMatrixFromIndex(TORAH_TEXT, intersection.intersectionIndex);
    const matrixString = matrix.map(row => row.join(' ')).join('\n');

    const { output: revelation } = await revelationPrompt({
        conceptA,
        conceptB,
        hebrewTermA: intersection.a.term,
        hebrewTermB: intersection.b.term,
        skipA: intersection.a.skip,
        skipB: intersection.b.skip,
        matrix: matrixString,
    });

    if (!revelation) {
        throw new Error("El Oráculo no pudo generar una revelación para la intersección encontrada.");
    }
    
    return {
      foundTerm: `${intersection.a.term} ∩ ${intersection.b.term}`,
      skip: intersection.distance, // Usamos 'skip' para almacenar la distancia de la intersección.
      startIndex: intersection.intersectionIndex,
      matrix,
      revelation,
    };
  }
);

    
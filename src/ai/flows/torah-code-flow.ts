
'use server';
/**
 * @fileOverview Biblioteca de Oráculos de la Torá.
 *
 * - runResonanceAnalysis: Analiza la intersección de dos conceptos.
 * - runClassicAnalysis: Analiza un solo concepto en profundidad.
 * - runTemporalStrandAnalysis: Analiza una fecha específica.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { TORAH_TEXT } from '@/lib/torah-text';
import type { TorahCodeAnalysis, TemporalStrandAnalysis, TorahRevelation } from '@/lib/types';
import { Gematria, findELS, findWordsAtELS, extractMatrixFromIndex } from '@/lib/torah-utils';


// --- SCHEMA DEFINITIONS ---

// Schemas for Resonance & Classic Analysis
const ResonanceInputSchema = z.object({
  conceptA: z.string().describe('El primer concepto para el análisis de resonancia.'),
  conceptB: z.string().describe('El segundo concepto para el análisis de resonancia.'),
});
const ClassicInputSchema = z.object({
  concept: z.string().describe('El concepto para el análisis clásico.'),
});

const CryptographicTermSchema = z.object({
  hebrewTerm: z.string().describe('Un término hebreo existente y relevante (sin vocales) que se relaciona conceptualmente con la búsqueda.'),
  explanation: z.string().describe('Una breve explicación de por qué este término hebreo real se relaciona con la búsqueda original.'),
  skipEquation: z.number().int().min(1).describe('La distancia de salto (skip) que la IA considera óptima para este término específico.'),
});

const CryptographicDesignOutputSchema = z.object({
  searchTerms: z.array(CryptographicTermSchema).describe('Lista de términos hebreos para el concepto.'),
});
const DualCryptographicDesignOutputSchema = z.object({
  searchTermsA: z.array(CryptographicTermSchema).describe('Lista de términos hebreos para el Concepto A.'),
  searchTermsB: z.array(CryptographicTermSchema).describe('Lista de términos hebreos para el Concepto B.'),
});

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
    context: z.string().describe("Explicación de los términos y saltos encontrados."),
    gematriaConnection: z.string().describe("Análisis de la Gematria del término(s) y su conexión mística."),
    reflection: z.string().describe("Una pregunta final, poderosa y abierta, para la reflexión del usuario."),
    past: PastRevelationSchema.optional(),
    present: PresentRevelationSchema.optional(),
    future: FutureRevelationSchema.optional(),
    archetype: ArchetypeRevelationSchema.optional(),
    esoteric: EsotericRevelationSchema.optional(),
    therapeutic: TherapeuticRevelationSchema.optional(),
    prophetic: PropheticRevelationSchema.optional(),
});

const AnalysisResultSchema = z.object({
  foundTerm: z.string(),
  skip: z.number().int(),
  startIndex: z.number().int(),
  matrix: z.array(z.array(z.string())).describe('Una matriz de 21x21 de letras hebreas centrada en la intersección.'),
  revelation: RevelationOutputSchema,
});


// Schemas for Temporal Strand Analysis
const TemporalStrandInputSchema = z.object({
  date: z.string().describe('La fecha en formato ISO para el análisis.'),
});
const TemporalStrandOutputSchema = z.object({
  title: z.string().describe('Un título poético para la revelación.'),
  temporalStrand: z.array(z.string()).describe('La secuencia de 3 a 7 palabras hebreas encontradas.'),
  interpretation: z.string().describe('La interpretación unificada y poética de la secuencia encontrada.'),
  date: z.string(),
});



// --- HELPER FUNCTIONS (Resonance Analysis) ---

type ELSResult = {
    term: string;
    skip: number;
    indices: number[];
};

function findClosestIntersection(resultsA: ELSResult[], resultsB: ELSResult[]): {a: ELSResult, b: ELSResult, intersectionIndex: number, distance: number} | null {
    let closestPair = null;
    let minDistance = Infinity;

    for (const resA of resultsA) {
        for (const resB of resultsB) {
            const indicesA = new Set(resA.indices);
            for (const indexB of resB.indices) {
                if (indicesA.has(indexB)) {
                    return { a: resA, b: resB, intersectionIndex: indexB, distance: 0 };
                }
            }
            
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

// --- AI PROMPTS ---

const resonanceCryptographicDesignPrompt = ai.definePrompt({
    name: 'resonanceCryptographicDesignPrompt',
    input: { schema: ResonanceInputSchema },
    output: { schema: DualCryptographicDesignOutputSchema },
    prompt: `Eres un rabino cabalista experto y un criptógrafo místico. Tu tarea es tomar dos conceptos y diseñar conjuntos de búsqueda para encontrar su resonancia en la Torá.

**Concepto A:** "{{{conceptA}}}"
**Concepto B:** "{{{conceptB}}}"

**Tu Tarea:**

1.  **Traduce la Esencia:** Para cada concepto, encuentra entre 3 y 5 palabras o frases hebreas **reales** (sin vocales) que capturen su esencia más profunda. No inventes palabras, usa solo términos que existan en la Biblia o la tradición cabalística.
2.  **CRÍTICO: NO inventes palabras en hebreo.** Usa solo conceptos o palabras hebreas REALES.
3.  **Diseña Ecuaciones de Salto:** Para CADA término hebreo, asigna un número de salto (skip) que sea numerológicamente significativo (Gematria, fechas, etc.).
4.  **Proporciona una Explicación:** Justifica brevemente la elección de cada término hebreo.

Genera las listas para 'searchTermsA' y 'searchTermsB'.`,
});

const classicCryptographicDesignPrompt = ai.definePrompt({
    name: 'classicCryptographicDesignPrompt',
    input: { schema: ClassicInputSchema },
    output: { schema: CryptographicDesignOutputSchema },
    prompt: `Eres un rabino cabalista experto. Tu tarea es tomar un concepto y diseñar un conjunto de búsqueda para encontrar su resonancia en la Torá.
**CRÍTICO: NO inventes palabras en hebreo. Usa solo conceptos o palabras hebreas REALES que existan en la Biblia.**
**Concepto:** "{{{concept}}}"
Genera 3-5 palabras o frases hebreas **reales** (sin vocales) que se relacionen con la esencia del concepto. Para CADA término, asigna un número de salto (skip) numerológicamente significativo y justifica brevemente tu elección.`,
});


const revelationPrompt = ai.definePrompt({
    name: 'torahCodeRevelationPrompt',
    input: { schema: z.object({
        promptType: z.enum(['resonance', 'classic']),
        conceptA: z.string(),
        conceptB: z.string().optional(),
        hebrewTermA: z.string(),
        hebrewTermB: z.string().optional(),
        skipA: z.number(),
        skipB: z.number().optional(),
        matrix: z.string(),
    })},
    output: { schema: RevelationOutputSchema },
    prompt: `Eres un Oráculo multidimensional: una fusión de cabalista, psicólogo junguiano, vidente, y arquitecto de la realidad.
{{#if (eq promptType "resonance")}}
Has descubierto una intersección en la Torá donde resuenan los conceptos de "{{conceptA}}" (como "{{hebrewTermA}}") y "{{conceptB}}" (como "{{hebrewTermB}}").
{{else}}
Has descubierto una instancia del concepto "{{conceptA}}" (como "{{hebrewTermA}}") en la Torá.
{{/if}}

Tu tarea es generar un mosaico de revelaciones, analizando la matriz de su intersección desde siete perspectivas distintas y profundas.

**ESTRUCTURA DE SALIDA OBLIGATORIA (JSON):**

1.  **overallTitle**: Un título poético y evocador para la revelación completa.
2.  **context**: Explica la resonancia encontrada.
3.  **gematriaConnection**: Calcula el valor de Gematria de los términos hebreos. Explica la conexión mística entre ellos y con otros conceptos bíblicos que compartan esos valores.
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
11. **prophetic (El Arquitecto de la Realidad)**: Objeto con \`title\` y \`analysis\`. {{#if (eq promptType "resonance")}}Explica la ley universal o el principio cósmico fundamental que la intersección de estos dos conceptos revela sobre la propia construcción de la realidad.{{else}}Explica el principio cósmico o la ley universal que este concepto encarna y cómo influye en la realidad.{{/if}}

---
**CRÍTICO:** Analiza la matriz a fondo. Busca palabras cruzadas. Sé poético, profundo y claro.
---

**Matriz a Analizar:**
{{{matrix}}}

Genera el objeto JSON completo con los once campos solicitados.`,
});

const temporalStrandPrompt = ai.definePrompt({
    name: 'temporalStrandPrompt',
    input: { schema: z.object({ temporalStrand: z.array(z.string()) }) },
    output: { schema: z.object({ title: z.string(), interpretation: z.string() }) },
    prompt: `Eres un vidente que interpreta secuencias proféticas. Has extraído la siguiente "hebra temporal" de la Torá: {{{json temporalStrand}}}.
Tu tarea es tejer estas palabras en una interpretación poética y unificada. No analices cada palabra por separado; en su lugar, encuentra el mensaje oculto en su secuencia.
Genera un título evocador y una interpretación en formato Markdown.`,
});


// --- FLOWS ---

// ORACLE 1: Resonance Analysis (Dual Concept)
export const runResonanceAnalysis = ai.defineFlow(
  {
    name: 'runResonanceAnalysisFlow',
    inputSchema: ResonanceInputSchema,
    outputSchema: AnalysisResultSchema,
  },
  async ({ conceptA, conceptB }) => {
    const { output: design } = await resonanceCryptographicDesignPrompt({ conceptA, conceptB });
    if (!design || !design.searchTermsA.length || !design.searchTermsB.length) {
      throw new Error("La IA no pudo diseñar términos de búsqueda para los conceptos dados.");
    }
    
    const resultsA = design.searchTermsA.map(term => ({ term: term.hebrewTerm, skip: term.skipEquation, indices: findELS(TORAH_TEXT, term.hebrewTerm, term.skipEquation) })).filter(r => r.indices.length > 0);
    const resultsB = design.searchTermsB.map(term => ({ term: term.hebrewTerm, skip: term.skipEquation, indices: findELS(TORAH_TEXT, term.hebrewTerm, term.skipEquation) })).filter(r => r.indices.length > 0);
    
    if (resultsA.length === 0 || resultsB.length === 0) {
      throw new Error(`No se encontraron secuencias en la Torá para uno o ambos conceptos. Concepto A: ${resultsA.length > 0}, Concepto B: ${resultsB.length > 0}`);
    }

    const intersection = findClosestIntersection(resultsA, resultsB);
    if (!intersection) {
      throw new Error(`No se encontró una resonancia o intersección clara entre '${conceptA}' y '${conceptB}'.`);
    }

    const matrix = extractMatrixFromIndex(TORAH_TEXT, intersection.intersectionIndex);
    const matrixString = matrix.map(row => row.join(' ')).join('\n');

    const { output: revelation } = await revelationPrompt({
        promptType: 'resonance',
        conceptA,
        conceptB,
        hebrewTermA: intersection.a.term,
        hebrewTermB: intersection.b.term,
        skipA: intersection.a.skip,
        skipB: intersection.b.skip,
        matrix: matrixString,
    });
    if (!revelation) throw new Error("El Oráculo no pudo generar una revelación.");
    
    return {
      foundTerm: `${intersection.a.term} ∩ ${intersection.b.term}`,
      skip: intersection.distance,
      startIndex: intersection.intersectionIndex,
      matrix,
      revelation,
    };
  }
);


// ORACLE 2: Classic Analysis (Single Concept)
export const runClassicAnalysis = ai.defineFlow(
  {
    name: 'runClassicAnalysisFlow',
    inputSchema: ClassicInputSchema,
    outputSchema: AnalysisResultSchema,
  },
  async ({ concept }) => {
    // Stage 1: Conceptual Search Design
    const { output: design } = await classicCryptographicDesignPrompt({ concept });
    if (!design || !design.searchTerms.length) {
        throw new Error("La IA no pudo diseñar términos de búsqueda para el concepto.");
    }
    
    // Stage 2: Exhaustive ELS Search (STAGE 1 of the two-stage search)
    let foundResult: (ELSResult & { term: string }) | null = null;
    for (const term of design.searchTerms) {
        for (let skip = 1; skip <= 50000; skip++) {
            const indices = findELS(TORAH_TEXT, term.hebrewTerm, skip);
            if (indices.length > 0) {
                foundResult = { term: term.hebrewTerm, skip: skip, indices };
                break;
            }
        }
        if (foundResult) break;
    }

    // Stage 3: Forced Gematria Search (STAGE 2) if nothing was found
    if (!foundResult) {
        const searchTermHebrew = concept; // For simplicity, assume user input is convertible.
        const gematriaSkip = Gematria(searchTermHebrew);
        if (gematriaSkip > 0) {
            const forcedWords = findWordsAtELS(TORAH_TEXT, gematriaSkip, 3, 4); // Find words of length 3 or 4
            if (forcedWords.length > 0) {
                foundResult = {
                    term: forcedWords[0].word,
                    skip: gematriaSkip,
                    indices: [forcedWords[0].startIndex],
                };
            }
        }
    }

    if (!foundResult) {
      const triedTerms = design.searchTerms.map(t => t.hebrewTerm).join(', ');
      throw new Error(`No se encontraron conexiones para '${concept}' en la Torá (se intentó con los conceptos: ${triedTerms}).`);
    }

    const startIndex = foundResult.indices[0];
    const matrix = extractMatrixFromIndex(TORAH_TEXT, startIndex);
    const matrixString = matrix.map(row => row.join(' ')).join('\n');

    const { output: revelation } = await revelationPrompt({
        promptType: 'classic',
        conceptA: concept,
        hebrewTermA: foundResult.term,
        skipA: foundResult.skip,
        matrix: matrixString,
    });
    if (!revelation) throw new Error("El Oráculo no pudo generar una revelación.");

    return {
      foundTerm: foundResult.term,
      skip: foundResult.skip,
      startIndex,
      matrix,
      revelation,
    };
  }
);

// ORACLE 3: Temporal Strand Analysis
export const runTemporalStrandAnalysis = ai.defineFlow(
  {
    name: 'runTemporalStrandAnalysisFlow',
    inputSchema: TemporalStrandInputSchema,
    outputSchema: TemporalStrandOutputSchema,
  },
  async ({ date }) => {
      const d = new Date(date);
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const year = d.getFullYear();

      // Simple numerology to get an index.
      let temporalIndex = (day * month * year) % (TORAH_TEXT.length - 100);

      const substring = TORAH_TEXT.substring(temporalIndex, temporalIndex + 100);
      const words = substring.split('').reduce((acc, char) => {
          if (char.match(/[\u0590-\u05FF]/)) {
              if (acc.length === 0 || !acc[acc.length - 1].match(/[\u0590-\u05FF]/)) {
                  acc.push(char);
              } else {
                  acc[acc.length - 1] += char;
              }
          }
          return acc;
      }, [] as string[]);
      
      const temporalStrand = words.slice(0, 7);

      const { output } = await temporalStrandPrompt({ temporalStrand });
      if (!output) throw new Error("El Oráculo no pudo generar una revelación temporal.");

      return {
          ...output,
          temporalStrand,
          date,
      };
  }
);

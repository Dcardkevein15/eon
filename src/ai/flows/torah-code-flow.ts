

'use server';
/**
 * @fileOverview Biblioteca de Oráculos de la Torá.
 *
 * - runResonanceAnalysis: Analiza la intersección de dos conceptos.
 * - runClassicAnalysis: Analiza un solo concepto en profundidad.
 * - runTemporalStrandAnalysis: Analiza una fecha específica.
 * - runHarmonicAnalysis: Analiza la frecuencia de un concepto en la Torá.
 * - runCrossMatrixAnalysis: Analiza las trayectorias resultantes de una intersección.
 * - runProfileAnalysis: Analiza el perfil psicológico del usuario para encontrar una resonancia personal.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { TORAH_TEXT } from '@/lib/torah-text';
import type { TorahCodeAnalysis, TemporalStrandAnalysis, TorahRevelation, HarmonicAnalysis, CrossMatrixAnalysis } from '@/lib/types';
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

// Schemas for Harmonic Analysis
const HarmonicInputSchema = z.object({
  concept: z.string(),
});

const HarmonicOutputSchema = z.object({
    title: z.string(),
    description: z.string(),
    resonanceData: z.array(z.object({
        segment: z.number(),
        score: z.number(),
        book: z.enum(['Génesis', 'Éxodo', 'Levítico', 'Números', 'Deuteronomio']),
    })),
    peakAnalysis: z.string().describe("Análisis detallado en Markdown de los 3 picos más altos de resonancia."),
});

// Schemas for Cross-Matrix (Destiny) Analysis
const DestinyInputSchema = z.object({
  conceptA: z.string(),
  conceptB: z.string(),
});

const DestinyOutputSchema = z.object({
    title: z.string(),
    catalystEvent: z.string().describe("La palabra o evento en la intersección."),
    trajectoryA: z.object({ concept: z.string(), analysis: z.string() }),
    trajectoryB: z.object({ concept: z.string(), analysis: z.string() }),
    destinyPoint: z.string().describe("La conclusión profética de la interacción."),
});

// Schema for Profile Analysis
const ProfileAnalysisInputSchema = z.object({
  userProfile: z.string().describe('El perfil psicológico completo del usuario en formato JSON.'),
});


// --- HELPER FUNCTIONS ---

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
        promptType: z.enum(['resonance', 'classic', 'profile']),
        conceptA: z.string(),
        conceptB: z.string().optional(),
        hebrewTermA: z.string(),
        hebrewTermB: z.string().optional(),
        skipA: z.number(),
        skipB: z.number().optional(),
        matrix: z.string(),
        userProfileContext: z.string().optional(),
    })},
    output: { schema: RevelationOutputSchema },
    prompt: `Eres un Oráculo multidimensional: una fusión de cabalista, psicólogo junguiano, vidente, y arquitecto de la realidad.
{{#if conceptB}}
Has descubierto una intersección en la Torá donde resuenan los conceptos de "{{conceptA}}" (como "{{hebrewTermA}}") y "{{conceptB}}" (como "{{hebrewTermB}}").
{{else}}
Has descubierto una instancia del concepto "{{conceptA}}" (como "{{hebrewTermA}}") en la Torá.
{{/if}}

{{#if userProfileContext}}
**IMPORTANTE:** Esta revelación es para un individuo específico. Debes conectar cada análisis directamente con el perfil psicológico proporcionado. Usa el perfil para dar un significado profundamente personal a la revelación.
<perfil_psicologico>
{{{userProfileContext}}}
</perfil_psicologico>
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

5.  **past (El Historiador)**: Objeto con 'title' y 'analysis'. Conecta la intersección con eventos o pasajes bíblicos.
6.  **present (El Psicólogo Simbólico)**: Objeto con 'title' y 'analysis'. Interpreta el significado para el "ahora", analizando el conflicto simbólico y psicológico que la colisión de conceptos revela.
7.  **future (El Profeta Espiritual)**: Objeto con 'title' y 'analysis'. Ofrece una proyección futura basada en los patrones. Preséntalo como una visión o advertencia.
8.  **archetype (El Intérprete de Arquetipos)**: Objeto con 'title' y 'analysis'. Identifica el arquetipo junguiano dominante que emerge de la intersección.
9.  **esoteric (El Místico)**: Objeto con 'title' y 'analysis'. Interpreta la matriz desde un punto de vista de energías, vibraciones y lecciones universales.
10. **therapeutic (El Coach)**: Objeto con 'title' y 'analysis'. Destila toda la revelación en un consejo práctico y accionable.
11. **prophetic (El Arquitecto de la Realidad)**: Objeto con 'title' y 'analysis'. {{#if conceptB}}Explica la ley universal o el principio cósmico fundamental que la intersección de estos dos conceptos revela sobre la propia construcción de la realidad.{{else}}Explica el principio cósmico o la ley universal que este concepto encarna y cómo influye en la realidad.{{/if}}

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

const harmonicAnalysisPrompt = ai.definePrompt({
    name: 'harmonicAnalysisPrompt',
    input: { schema: z.object({ concept: z.string(), segments: z.array(z.string()) }) },
    output: { schema: z.object({ scores: z.array(z.number()), peakAnalysis: z.string() }) },
    prompt: `Eres un analista de datos teológico. Se te ha dado el texto de la Torá dividido en 100 segmentos y un concepto clave.

**Concepto:** "{{concept}}"

**Tu Tarea:**
1.  **Puntúa cada segmento:** Para cada uno de los 100 segmentos de texto que te proporciono, dale una puntuación de 0 a 10 que represente qué tan fuerte es la resonancia o presencia del concepto "{{concept}}". 0 significa ausencia total, 10 significa que es el tema central y dominante del segmento. Devuelve un array de 100 números.
2.  **Analiza los 3 Picos Más Altos:** Identifica los 3 segmentos con la puntuación más alta. Para cada uno de estos picos, escribe un breve análisis en formato Markdown explicando por qué el concepto resuena tan fuertemente allí. Menciona los eventos o narrativas clave de ese pasaje (ej: "El pico en el segmento 45 corresponde a las detalladas instrucciones para construir el Tabernáculo, un acto que requiere la máxima 'Sabiduría' divina y artesanal.").

**Segmentos de la Torá:**
{{{json segments}}}

Devuelve un objeto JSON con "scores" (el array de 100 números) y "peakAnalysis" (el texto en Markdown).`,
});

const destinyAnalysisPrompt = ai.definePrompt({
    name: 'destinyAnalysisPrompt',
    input: { schema: z.object({ conceptA: z.string(), conceptB: z.string(), crossedWords: z.array(z.string()) }) },
    output: { schema: DestinyOutputSchema },
    prompt: `Eres un cronista kármico. Has encontrado un punto de intersección en la Torá entre dos conceptos y has extraído las trayectorias que le siguen.

**Concepto A (Causa):** {{conceptA}}
**Concepto B (Efecto):** {{conceptB}}
**Palabras Cruzadas Relevantes:** {{json crossedWords}}

**Tu Tarea:**
Analiza estas trayectorias para revelar la ley de causa y efecto que las gobierna.

1.  **title**: Genera un título evocador para esta revelación, como "La Sombra del Poder" o "El Eco de una Elección".
2.  **catalystEvent**: Identifica la palabra o frase más significativa en la intersección. ¿Cuál es el "evento catalizador" que une ambas fuerzas?
3.  **trajectoryA**: Describe la trayectoria del Concepto A. ¿Qué sucede cuando sigues su camino? ¿Cuál es su consecuencia natural?
4.  **trajectoryB**: Describe la trayectoria del Concepto B. ¿Qué sucede cuando sigues su camino?
5.  **destinyPoint**: Esta es la revelación principal. Sintetiza ambas trayectorias y formula una conclusión profética. ¿Cuál es la consecuencia inevitable de la interacción de estas dos fuerzas? ¿Qué ley del universo se está demostrando aquí?`,
});

const profileConceptExtractionPrompt = ai.definePrompt({
    name: 'profileConceptExtractionPrompt',
    input: { schema: ProfileAnalysisInputSchema },
    output: { schema: ResonanceInputSchema },
    prompt: `Eres un psicólogo analítico y un cabalista. Tu tarea es leer un perfil psicológico y destilar su esencia en DOS conceptos nucleares para un análisis místico.

<perfil_psicologico>
{{{userProfile}}}
</perfil_psicologico>

Analiza el perfil (especialmente el coreConflict, el coreArchetype y los nodos del emotionalConstellation) e identifica la tensión o dualidad más importante. Devuelve DOS conceptos de una sola palabra que capturen esta dinámica.

Ejemplos:
- Si el conflicto es entre seguridad y libertad, devuelve: { "conceptA": "Orden", "conceptB": "Caos" }
- Si el arquetipo es el Cuidador que lucha con el resentimiento, devuelve: { "conceptA": "Sacrificio", "conceptB": "Voluntad" }
- Si el tema es la ansiedad por el futuro, devuelve: { "conceptA": "Miedo", "conceptB": "Fe" }

Devuelve únicamente el objeto JSON con "conceptA" y "conceptB".`,
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
    
    // Perform an exhaustive search for each term in both concepts
    const findExhaustiveELS = (term: z.infer<typeof CryptographicTermSchema>): ELSResult[] => {
        const results: ELSResult[] = [];
        // First, try the AI-suggested skip
        let indices = findELS(TORAH_TEXT, term.hebrewTerm, term.skipEquation);
        if (indices.length > 0) {
            results.push({ term: term.hebrewTerm, skip: term.skipEquation, indices });
        }
        // Then, perform a broader search if needed (or always, for more options)
        for (let skip = 1; skip <= 50000; skip += 1) { // A reasonable but large range
             if (skip === term.skipEquation) continue; // Don't repeat
             indices = findELS(TORAH_TEXT, term.hebrewTerm, skip);
             if (indices.length > 0) {
                 results.push({ term: term.hebrewTerm, skip, indices });
             }
        }
        return results;
    };
    
    const resultsA = design.searchTermsA.flatMap(findExhaustiveELS);
    const resultsB = design.searchTermsB.flatMap(findExhaustiveELS);
    
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
    // STAGE 1: Deep conceptual search
    const { output: design } = await classicCryptographicDesignPrompt({ concept });
    if (!design || !design.searchTerms.length) {
        throw new Error("La IA no pudo diseñar términos de búsqueda para el concepto.");
    }
    
    let foundResult: (ELSResult & { term: string }) | null = null;
    for (const term of design.searchTerms) {
        for (let skip = 1; skip <= 50000; skip++) {
            const indices = findELS(TORAH_TEXT, term.hebrewTerm, skip);
            if (indices.length > 0) {
                // Found the first occurrence, let's use it
                foundResult = { term: term.hebrewTerm, skip: skip, indices };
                break;
            }
        }
        if (foundResult) break;
    }

    // STAGE 2: Forced Gematria search (if stage 1 failed)
    if (!foundResult) {
        const searchTermHebrew = concept; // A simple transliteration might not be accurate, but it's a fallback
        const gematriaSkip = Gematria(searchTermHebrew);
        if (gematriaSkip > 0) {
            // Find ANY word at this skip distance
            const forcedWords = findWordsAtELS(TORAH_TEXT, gematriaSkip, 3, 4); // Find words of 3-4 letters
            if (forcedWords.length > 0) {
                // Use the first found word as the new term
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


// ORACLE 4: Harmonic Analysis
export const runHarmonicAnalysis = ai.defineFlow(
    {
        name: 'runHarmonicAnalysisFlow',
        inputSchema: HarmonicInputSchema,
        outputSchema: HarmonicOutputSchema,
    },
    async ({ concept }) => {
        const totalLength = TORAH_TEXT.length;
        const bookBoundaries = [
            Math.floor(totalLength * 0.26), // Genesis
            Math.floor(totalLength * 0.49), // Exodus
            Math.floor(totalLength * 0.64), // Leviticus
            Math.floor(totalLength * 0.83)  // Numbers
        ];

        const numSegments = 100;
        const segmentLength = Math.floor(totalLength / numSegments);
        const segments = Array.from({ length: numSegments }, (_, i) =>
            TORAH_TEXT.substring(i * segmentLength, (i + 1) * segmentLength)
        );

        const { output } = await harmonicAnalysisPrompt({ concept, segments });
        if (!output || !output.scores || output.scores.length !== numSegments) {
            throw new Error("El análisis armónico no pudo generar las puntuaciones.");
        }
        
        const resonanceData = output.scores.map((score, index) => {
            const position = index * segmentLength;
            let book: HarmonicAnalysis['resonanceData'][0]['book'] = 'Deuteronomio';
            if (position < bookBoundaries[0]) book = 'Génesis';
            else if (position < bookBoundaries[1]) book = 'Éxodo';
            else if (position < bookBoundaries[2]) book = 'Levítico';
            else if (position < bookBoundaries[3]) book = 'Números';

            return { segment: index, score, book };
        });

        return {
            title: `Análisis Armónico de '${concept}'`,
            description: `Visualización de la frecuencia e intensidad del concepto "${concept}" a lo largo de los cinco libros de la Torá.`,
            resonanceData,
            peakAnalysis: output.peakAnalysis,
        };
    }
);

// ORACLE 5: Cross-Matrix (Destiny) Analysis
export const runCrossMatrixAnalysis = ai.defineFlow(
    {
        name: 'runCrossMatrixAnalysisFlow',
        inputSchema: DestinyInputSchema,
        outputSchema: DestinyOutputSchema,
    },
    async ({ conceptA, conceptB }) => {
        // Find intersection point (re-using resonance logic)
        const intersectionResult = await runResonanceAnalysis({ conceptA, conceptB });
        
        const textFromStartA = TORAH_TEXT.substring(intersectionResult.startIndex);
        const textFromStartB = TORAH_TEXT.substring(intersectionResult.startIndex);
        
        const wordsA = findWordsAtELS(textFromStartA, intersectionResult.revelation.skipA || 1, 3, 7, 5);
        const wordsB = findWordsAtELS(textFromStartB, intersectionResult.revelation.skipB || 1, 3, 7, 5);

        const { output } = await destinyAnalysisPrompt({
            conceptA,
            conceptB,
            crossedWords: [...wordsA.map(w => w.word), ...wordsB.map(w => w.word)],
        });

        if (!output) {
            throw new Error("El Oráculo del Destino no pudo generar una revelación.");
        }

        return output;
    }
);

// ORACLE 6: Profile Cryptographic Analysis (The Oracle of the Soul)
export const runProfileAnalysis = ai.defineFlow(
    {
        name: 'runProfileAnalysisFlow',
        inputSchema: ProfileAnalysisInputSchema,
        outputSchema: z.object({
            analysis: AnalysisResultSchema,
            concepts: ResonanceInputSchema,
        }),
    },
    async ({ userProfile }) => {
        // 1. Extract core concepts from the user's profile
        const { output: concepts } = await profileConceptExtractionPrompt({ userProfile });
        if (!concepts || !concepts.conceptA || !concepts.conceptB) {
            throw new Error("La IA no pudo destilar los conceptos nucleares de tu perfil.");
        }

        // 2. Run the full Resonance Analysis on these extracted concepts
        const analysis = await runResonanceAnalysis({ conceptA: concepts.conceptA, conceptB: concepts.conceptB });

        // 3. (Future enhancement) Could run a modified revelation prompt that *requires* the user profile context
        // For now, the standard one is powerful enough. We will just pass the context.
        const matrixString = analysis.matrix.map(row => row.join(' ')).join('\n');
        const { output: personalizedRevelation } = await revelationPrompt({
            promptType: 'profile',
            conceptA: concepts.conceptA,
            conceptB: concepts.conceptB,
            hebrewTermA: analysis.foundTerm.split(' ∩ ')[0],
            hebrewTermB: analysis.foundTerm.split(' ∩ ')[1],
            skipA: analysis.skip, // This needs adjustment, skip is distance not individual skips
            skipB: 0, // This needs adjustment
            matrix: matrixString,
            userProfileContext: userProfile,
        });

        if (!personalizedRevelation) {
            throw new Error("El Oráculo no pudo generar una revelación personalizada para tu perfil.");
        }

        return {
            analysis: { ...analysis, revelation: personalizedRevelation },
            concepts,
        };
    }
);

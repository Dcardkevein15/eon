'use server';
/**
 * @fileOverview Flujo de análisis de criptomonedas multi-agente.
 * Simula un debate entre dos analistas de IA (uno técnico y otro fundamental)
 * y un tercer agente sintetiza sus conclusiones en señales de trading.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { type CryptoDebateTurn, type TradingSignal } from '@/lib/types';

// Esquemas de Entrada y Salida del Flujo Principal
export const CryptoAnalysisInputSchema = z.object({
  previousAlphaState: z.string().optional().describe('El resumen del resultado del análisis anterior para mantener una memoria contextual.'),
});
type CryptoAnalysisInput = z.infer<typeof CryptoAnalysisInputSchema>;

export const CryptoAnalysisOutputSchema = z.object({
  debate: z.array(z.object({
    analyst: z.enum(['Apex', 'Helios']),
    argument: z.string(),
  })),
  synthesis: z.string(),
  signals: z.array(z.object({
    crypto: z.string(),
    action: z.enum(['COMPRAR', 'VENDER', 'MANTENER']),
    price: z.number(),
    reasoning: z.string(),
  })),
});
type CryptoAnalysisOutput = z.infer<typeof CryptoAnalysisOutputSchema>;

// Esquema para el turno de un analista
const AnalystTurnInputSchema = z.object({
  analystName: z.enum(['Apex', 'Helios']),
  debateHistory: z.string(),
  previousAlphaState: z.string().optional(),
});
const AnalystTurnOutputSchema = z.object({
  argument: z.string().describe("El siguiente argumento o refutación en el debate, terminando con una pregunta directa al otro analista."),
});

// Esquema para la síntesis
const SynthesizerInputSchema = z.object({
  fullDebate: z.string(),
});
const SynthesizerOutputSchema = z.object({
  synthesis: z.string().describe("Un resumen conciso del debate, destacando los puntos de acuerdo, desacuerdo y las conclusiones emergentes."),
  signals: z.array(z.object({
    crypto: z.string().describe("Símbolo de la criptomoneda (ej. BTC, ETH)."),
    action: z.enum(['COMPRAR', 'VENDER', 'MANTENER']).describe("La acción de trading recomendada."),
    price: z.number().describe("El precio de ejecución sugerido en USD."),
    reasoning: z.string().describe("Una justificación breve y clara para la señal."),
  })).describe("Una lista de las 3 señales de trading más fuertes del día."),
});


// Prompts de los Agentes
const analystPrompt = ai.definePrompt({
  name: 'analystPrompt',
  input: { schema: AnalystTurnInputSchema },
  output: { schema: AnalystTurnOutputSchema },
  prompt: `Eres {{{analystName}}}, un analista experto en criptomonedas.
  {{#if (eq analystName "Apex")}}
  Tu identidad: Eres 'Apex', un analista técnico obsesionado con los datos. Te basas en gráficos, indicadores (RSI, MACD, Medias Móviles), volumen y patrones de velas. Descartas el ruido de las noticias. Eres escéptico y directo.
  {{else}}
  Tu identidad: Eres 'Helios', un analista fundamental visionario. Te enfocas en la tecnología subyacente, el equipo del proyecto, las noticias (tokenomics), la regulación y el sentimiento en redes sociales. Crees que el valor a largo plazo supera las fluctuaciones a corto plazo.
  {{/if}}

  Estás en un debate en vivo con tu contraparte. Vuestro objetivo combinado es generar las señales de trading más rentables para hoy.

  Memoria del Último Análisis (Alpha State): {{{previousAlphaState}}}
  
  Debate hasta ahora:
  {{{debateHistory}}}

  Tu tarea:
  1. Analiza el último argumento de tu contraparte.
  2. Formula tu siguiente argumento o refutación desde TU perspectiva única (Técnica o Fundamental).
  3. Sé conciso pero impactante.
  4. Termina SIEMPRE con una pregunta directa y desafiante para el otro analista.`,
});

const synthesizerPrompt = ai.definePrompt({
  name: 'synthesizerPrompt',
  input: { schema: SynthesizerInputSchema },
  output: { schema: SynthesizerOutputSchema },
  prompt: `Eres 'The Synthesizer', un estratega de trading de IA de élite. Has observado el siguiente debate entre Apex (analista técnico) y Helios (analista fundamental).

  Debate completo:
  {{{fullDebate}}}

  Tu tarea es doble:
  1.  **Síntesis:** Escribe un resumen estratégico del debate. ¿Cuáles fueron los puntos clave de conflicto y acuerdo? ¿Qué catalizadores o riesgos son más importantes? ¿Cuál es el sentimiento general del mercado que se desprende de la discusión?
  2.  **Señales Accionables:** Basado en la síntesis, genera las 3 señales de trading más potentes y con mayor probabilidad de éxito para el día de hoy. Para cada señal, especifica la criptomoneda, la acción (COMPRAR, VENDER, MANTENER), un precio de ejecución preciso en USD y una breve justificación. Prioriza la claridad y la accionabilidad.`,
});


// Flujo Principal de Orquestación
export const runCryptoAnalysis = ai.defineFlow(
  {
    name: 'runCryptoAnalysisFlow',
    inputSchema: CryptoAnalysisInputSchema,
    outputSchema: z.any(), // Se usará un stream para la salida
  },
  async (input) => {
    
    return new Flow(async function* (flow) {
      let debateHistory = '';
      const MAX_TURNS = 3; // 3 turnos para cada analista

      for (let i = 0; i < MAX_TURNS; i++) {
        // Turno de Apex (Técnico)
        const apexInput = { analystName: 'Apex' as const, debateHistory, previousAlphaState: input.previousAlphaState };
        const { output: apexOutput } = await analystPrompt(apexInput);
        if (!apexOutput?.argument) throw new Error("Apex failed to respond.");
        const apexTurn: CryptoDebateTurn = { analyst: 'Apex', argument: apexOutput.argument };
        debateHistory += `Apex: ${apexOutput.argument}\n\n`;
        yield { type: 'debateTurn', turn: apexTurn };
        
        flow.stream({ type: 'synthesisChunk', chunk: '.' });

        // Turno de Helios (Fundamental)
        const heliosInput = { analystName: 'Helios' as const, debateHistory, previousAlphaState: input.previousAlphaState };
        const { output: heliosOutput } = await analystPrompt(heliosInput);
        if (!heliosOutput?.argument) throw new Error("Helios failed to respond.");
        const heliosTurn: CryptoDebateTurn = { analyst: 'Helios', argument: heliosOutput.argument };
        debateHistory += `Helios: ${heliosOutput.argument}\n\n`;
        yield { type: 'debateTurn', turn: heliosTurn };
        
        flow.stream({ type: 'synthesisChunk', chunk: '.' });
      }

      // Turno del Sintetizador
      const synthesizerInput = { fullDebate: debateHistory };
      const { stream, response } = synthesizerPrompt.stream(synthesizerInput);

      let finalResult: CryptoAnalysisOutput | null = null;
      for await (const chunk of stream) {
        if(chunk.synthesis) {
           yield { type: 'synthesisChunk', chunk: chunk.synthesis.replace(finalResult?.synthesis || '', '') };
        }
        finalResult = chunk;
      }
      
      const synthesizerResult = await response;
      if (!synthesizerResult.output?.signals) throw new Error("Synthesizer failed to generate signals.");

      yield { type: 'finalSignals', signals: synthesizerResult.output.signals };
      
      return synthesizerResult.output;
    });
  }
);

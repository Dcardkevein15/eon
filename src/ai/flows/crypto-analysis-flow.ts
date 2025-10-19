'use server';
/**
 * @fileOverview Flujo de análisis de criptomonedas multi-agente.
 * Simula un debate entre dos analistas de IA (uno técnico y otro fundamental)
 * y un tercer agente sintetiza sus conclusiones en señales de trading.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  CryptoAnalysisInputSchema,
  AnalystTurnInputSchema,
  AnalystTurnOutputSchema,
  SynthesizerInputSchema,
  SynthesizerOutputSchema,
  type CryptoDebateTurn,
  type CryptoAnalysisOutput,
  type TradingSignal,
} from '@/lib/types';


// Prompts de los Agentes
const analystPrompt = ai.definePrompt({
  name: 'analystPrompt',
  input: { schema: AnalystTurnInputSchema },
  output: { schema: AnalystTurnOutputSchema },
  prompt: `Eres {{{analystName}}}, un analista experto en criptomonedas.
  {{#if (analystName === "Apex")}}
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
export async function* runCryptoAnalysis(input: z.infer<typeof CryptoAnalysisInputSchema>) {
    
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
        
        // Simula el "tipeo" del sintetizador
        yield { type: 'synthesisChunk', chunk: '.' };

        // Turno de Helios (Fundamental)
        const heliosInput = { analystName: 'Helios' as const, debateHistory, previousAlphaState: input.previousAlphaState };
        const { output: heliosOutput } = await analystPrompt(heliosInput);
        if (!heliosOutput?.argument) throw new Error("Helios failed to respond.");
        const heliosTurn: CryptoDebateTurn = { analyst: 'Helios', argument: heliosOutput.argument };
        debateHistory += `Helios: ${heliosOutput.argument}\n\n`;
        yield { type: 'debateTurn', turn: heliosTurn };
        
        // Simula el "tipeo" del sintetizador
        yield { type: 'synthesisChunk', chunk: '.' };
      }

      // Turno del Sintetizador
      const synthesizerInput = { fullDebate: debateHistory };
      const { stream, response } = await synthesizerPrompt.stream(synthesizerInput);

      let finalResult: SynthesizerOutput | null = null;
      let fullSynthesis = '';
      
      for await (const chunk of stream) {
        if(chunk.output?.synthesis) {
           const newChunkText = chunk.output.synthesis.replace(fullSynthesis, '');
           if (newChunkText) {
             yield { type: 'synthesisChunk', chunk: newChunkText };
             fullSynthesis = chunk.output.synthesis;
           }
        }
        if (chunk.output) {
          finalResult = chunk.output;
        }
      }
      
      const synthesizerResult = await response;
      if (!synthesizerResult.output?.signals) throw new Error("Synthesizer failed to generate signals.");

      yield { type: 'finalSignals', signals: synthesizerResult.output.signals };
      
      return synthesizerResult.output;
}

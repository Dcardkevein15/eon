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
  type FullCryptoAnalysis,
  FullCryptoAnalysisSchema,
} from '@/lib/types';


// 1. Herramienta para obtener el precio actual
const get_crypto_price = ai.defineTool(
  {
    name: 'get_crypto_price',
    description: 'Obtiene el precio actual en USD de una criptomoneda específica.',
    inputSchema: z.object({
      crypto_id: z.string().describe("El ID de la criptomoneda según CoinGecko (ej: 'bitcoin', 'ethereum')."),
    }),
    outputSchema: z.object({
        price: z.number().describe("El precio actual en USD.")
    }),
  },
  async ({ crypto_id }) => {
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${crypto_id}&vs_currencies=usd`);
      if (!response.ok) {
        throw new Error(`Error al contactar la API de precios: ${response.statusText}`);
      }
      const data = await response.json();
      const price = data[crypto_id]?.usd;
      if (price === undefined) {
        throw new Error(`No se pudo encontrar el precio para ${crypto_id}.`);
      }
      return { price };
    } catch (error) {
      console.error('Error en la herramienta get_crypto_price:', error);
      return { price: -1 }; 
    }
  }
);

// Prompts de los Agentes
const analystPrompt = ai.definePrompt({
  name: 'analystPrompt',
  input: { schema: AnalystTurnInputSchema },
  output: { schema: AnalystTurnOutputSchema },
  tools: [get_crypto_price],
  prompt: `Eres {{{analystName}}}, un analista experto en criptomonedas.
  {{{identityDescription}}}

  Estás en un debate en vivo con tu contraparte. Vuestro objetivo combinado es generar las señales de trading más rentables para hoy.
  
  **IMPORTANTE**: Para tu análisis, DEBES usar la herramienta \`get_crypto_price\` para obtener datos de precios reales.

  Memoria del Último Análisis (Alpha State): {{{previousAlphaState}}}
  
  Debate hasta ahora:
  {{{debateHistory}}}

  Tu tarea:
  1. Llama a la herramienta para obtener el precio actual de 'bitcoin' o 'ethereum'.
  2. Formula tu siguiente argumento o refutación desde TU perspectiva única, utilizando el precio real que obtuviste.
  3. Sé conciso pero impactante.
  4. Termina SIEMPRE con una pregunta directa y desafiante para el otro analista.`,
});

const synthesizerPrompt = ai.definePrompt({
  name: 'synthesizerPrompt',
  input: { schema: SynthesizerInputSchema },
  output: { schema: SynthesizerOutputSchema },
  prompt: `Eres 'The Synthesizer', un estratega de trading de IA de élite. Has observado el siguiente debate entre Apex (analista técnico) y Helios (analista fundamental), quienes han usado datos en tiempo real.

  Debate completo:
  {{{fullDebate}}}

  Tu tarea es doble:
  1.  **Síntesis:** Escribe un resumen estratégico del debate. ¿Cuáles fueron los puntos clave de conflicto y acuerdo? ¿Qué catalizadores o riesgos son más importantes? ¿Cuál es el sentimiento general del mercado que se desprende de la discusión?
  2.  **Señales Accionables:** Basado en la síntesis y los datos discutidos, genera las 3 señales de trading más potentes. Para cada señal, especifica la criptomoneda, la acción (COMPRAR, VENDER, MANTENER), un precio de ejecución preciso en USD y una justificación clara y concisa en el campo 'reasoning'.`,
});


const getIdentityDescription = (analystName: 'Apex' | 'Helios'): string => {
  if (analystName === 'Apex') {
    return "Tu identidad: Eres 'Apex', un analista técnico obsesionado con los datos. Tu objetivo es detectar tendencias, soportes y resistencias. DEBES usar la herramienta `get_crypto_price` para el precio más reciente y basar tu análisis en él (tendencias, medias móviles, etc.).";
  } else {
    return "Tu identidad: Eres 'Helios', un analista fundamental visionario. Te enfocas en la tecnología subyacente, el equipo del proyecto, las noticias (tokenomics), la regulación y el sentimiento en redes sociales. DEBES usar la herramienta `get_crypto_price` para fundamentar tu análisis con el precio actual.";
  }
};


// Flujo Principal de Orquestación
export async function runCryptoAnalysis(input: z.infer<typeof CryptoAnalysisInputSchema>): Promise<FullCryptoAnalysis> {
    
      let debateHistory: CryptoDebateTurn[] = [];
      let debateHistoryString = '';
      const MAX_TURNS = 3;

      for (let i = 0; i < MAX_TURNS; i++) {
        // Turno de Apex (Técnico)
        const apexInput = { 
            analystName: 'Apex' as const, 
            debateHistory: debateHistoryString, 
            previousAlphaState: input.previousAlphaState || 'Sin estado previo.',
            identityDescription: getIdentityDescription('Apex')
        };
        const { output: apexOutput } = await analystPrompt(apexInput);

        if (!apexOutput?.argument) throw new Error("Apex failed to respond.");
        
        const apexTurn: CryptoDebateTurn = { analyst: 'Apex', argument: apexOutput.argument };
        debateHistory.push(apexTurn);
        debateHistoryString += `Apex: ${apexOutput.argument}\n\n`;
        
        // Turno de Helios (Fundamental)
        const heliosInput = { 
            analystName: 'Helios' as const, 
            debateHistory: debateHistoryString,
            previousAlphaState: input.previousAlphaState || 'Sin estado previo.',
            identityDescription: getIdentityDescription('Helios')
        };
        const { output: heliosOutput } = await analystPrompt(heliosInput);
        if (!heliosOutput?.argument) throw new Error("Helios failed to respond.");

        const heliosTurn: CryptoDebateTurn = { analyst: 'Helios', argument: heliosOutput.argument };
        debateHistory.push(heliosTurn);
        debateHistoryString += `Helios: ${heliosOutput.argument}\n\n`;
      }

      // Turno del Sintetizador
      const synthesizerInput = { fullDebate: debateHistoryString };
      const { output: synthesizerResult } = await synthesizerPrompt(synthesizerInput);

      if (!synthesizerResult || !synthesizerResult.synthesis || !synthesizerResult.signals) {
        throw new Error("Synthesizer failed to generate a complete analysis.");
      }
      
      const finalResult: FullCryptoAnalysis = {
        debate: debateHistory,
        synthesis: synthesizerResult.synthesis,
        signals: synthesizerResult.signals,
      };

      // Validate with Zod before returning
      return FullCryptoAnalysisSchema.parse(finalResult);
}

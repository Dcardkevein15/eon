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
  MarketChartDataSchema,
} from '@/lib/types';


// 1. Herramienta simple para obtener el precio actual
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

// 2. Nueva herramienta avanzada para obtener datos históricos del gráfico
const get_market_chart_data = ai.defineTool(
    {
        name: 'get_market_chart_data',
        description: 'Obtiene datos históricos del mercado (precio y volumen) para una criptomoneda durante los últimos 7 días. Esencial para el análisis técnico.',
        inputSchema: z.object({
            crypto_id: z.string().describe("El ID de la criptomoneda según CoinGecko (ej: 'bitcoin', 'ethereum')."),
        }),
        outputSchema: MarketChartDataSchema,
    },
    async ({ crypto_id }) => {
        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/coins/${crypto_id}/market_chart?vs_currency=usd&days=7&interval=daily`);
            if (!response.ok) {
                throw new Error(`Error al contactar la API de gráficos de mercado: ${response.statusText}`);
            }
            const data = await response.json();
            
            // Validar que los datos esperados están presentes
            if (!data.prices || !data.total_volumes) {
                throw new Error(`Datos de mercado incompletos para ${crypto_id}.`);
            }

            return {
                prices: data.prices,
                volumes: data.total_volumes,
            };
        } catch (error) {
            console.error('Error en la herramienta get_market_chart_data:', error);
            return { prices: [], volumes: [] };
        }
    }
);


const getIdentityDescription = (analystName: 'Apex' | 'Helios'): string => {
  if (analystName === 'Apex') {
    return "Tu identidad: Eres 'Apex', un analista técnico obsesionado con los datos. Tu objetivo es detectar tendencias, soportes y resistencias. DEBES usar la herramienta `get_market_chart_data` para obtener el gráfico de precios de los últimos 7 días de 'bitcoin' y basar tu análisis en estos datos (tendencias, medias móviles, etc.). Menciona si el precio actual está por encima o por debajo de la media de los últimos días. También puedes usar `get_crypto_price` para el precio más reciente.";
  } else {
    return "Tu identidad: Eres 'Helios', un analista fundamental visionario. Te enfocas en la tecnología subyacente, el equipo del proyecto, las noticias (tokenomics), la regulación y el sentimiento en redes sociales. DEBES usar la herramienta `get_crypto_price` para fundamentar tu análisis con el precio actual.";
  }
};

// Prompts de los Agentes
const analystPrompt = ai.definePrompt({
  name: 'analystPrompt',
  input: { schema: AnalystTurnInputSchema },
  output: { schema: AnalystTurnOutputSchema },
  tools: [get_crypto_price, get_market_chart_data], // <--- Ambas herramientas disponibles
  prompt: `Eres {{{analystName}}}, un analista experto en criptomonedas.
  {{{identityDescription}}}

  Estás en un debate en vivo con tu contraparte. Vuestro objetivo combinado es generar las señales de trading más rentables para hoy.
  
  **IMPORTANTE**: Para tu análisis, DEBES usar las herramientas disponibles para obtener datos reales.
  - Apex: Usa OBLIGATORIAMENTE \`get_market_chart_data\` para tu análisis técnico.
  - Helios: Usa OBLIGATORIAMENTE \`get_crypto_price\` para contextualizar tus fundamentales.

  Memoria del Último Análisis (Alpha State): {{{previousAlphaState}}}
  
  Debate hasta ahora:
  {{{debateHistory}}}

  Tu tarea:
  1. Llama a la/s herramienta/s apropiada/s.
  2. Formula tu siguiente argumento o refutación desde TU perspectiva única, utilizando los datos reales que obtuviste.
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
  2.  **Señales Accionables:** Basado en la síntesis y los datos discutidos (como cruces de medias móviles, picos de volumen, o noticias fundamentales), genera las 3 señales de trading más potentes. Para cada señal, especifica la criptomoneda, la acción (COMPRAR, VENDER, MANTENER), un precio de ejecución preciso en USD y una justificación técnica o fundamental clara.`,
});


// Flujo Principal de Orquestación
export async function runCryptoAnalysis(input: z.infer<typeof CryptoAnalysisInputSchema>): Promise<FullCryptoAnalysis> {
    
      let debateHistory: CryptoDebateTurn[] = [];
      let debateHistoryString = '';
      const MAX_TURNS = 1; // 1 turno = 1 argumento de Apex y 1 de Helios
      let marketChartData: z.infer<typeof MarketChartDataSchema> | null = null;

      for (let i = 0; i < MAX_TURNS; i++) {
        // Turno de Apex (Técnico)
        const apexInput = { 
            analystName: 'Apex' as const, 
            debateHistory: debateHistoryString, 
            previousAlphaState: input.previousAlphaState || 'Sin estado previo.',
            identityDescription: getIdentityDescription('Apex')
        };
        // Apex es el único que pide los datos del gráfico
        const { output: apexOutput, toolRequests } = await analystPrompt(apexInput);

        if (!apexOutput?.argument) throw new Error("Apex failed to respond.");

        // Verificamos si Apex usó la herramienta de gráfico y guardamos los datos
        const chartToolRequest = toolRequests.find(req => req.toolName === 'get_market_chart_data');
        if (chartToolRequest) {
            marketChartData = chartToolRequest.output as z.infer<typeof MarketChartDataSchema>;
        }
        
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
        marketData: marketChartData, // Adjuntamos los datos del gráfico a la respuesta final
      };

      // Validate with Zod before returning
      return FullCryptoAnalysisSchema.parse(finalResult);
}

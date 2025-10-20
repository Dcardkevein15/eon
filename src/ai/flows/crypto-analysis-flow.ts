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
  MarketDataSchema,
  IndicatorDataSchema,
  IndicatorsSchema
} from '@/lib/types';
import { SMA, MACD, RSI, BollingerBands } from 'technicalindicators';

// --- Herramientas de Datos de Mercado ---

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
      throw new Error(`Fallo en la herramienta get_crypto_price para ${crypto_id}: ${(error as Error).message}`);
    }
  }
);

const get_market_chart_data = ai.defineTool(
    {
        name: 'get_market_chart_data',
        description: 'Obtiene datos históricos del mercado (precio, volumen) para una criptomoneda durante los últimos 30 días, con granularidad diaria.',
        inputSchema: z.object({
            crypto_id: z.string().describe("El ID de la criptomoneda según CoinGecko (ej: 'bitcoin', 'ethereum').")
        }),
        outputSchema: MarketDataSchema,
    },
    async ({ crypto_id }) => {
        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/coins/${crypto_id}/market_chart?vs_currency=usd&days=30&interval=daily`);
            if (!response.ok) {
                throw new Error(`Error al contactar la API de gráficos de mercado: ${response.statusText}`);
            }
            const data = await response.json();
             if (!data.prices || !data.total_volumes) {
                throw new Error(`Datos incompletos recibidos de la API para ${crypto_id}`);
            }
            return {
                prices: data.prices.map(([timestamp, value]: [number, number]) => ({ timestamp, value })),
                volumes: data.total_volumes.map(([timestamp, value]: [number, number]) => ({ timestamp, value }))
            };
        } catch (error) {
            console.error('Error en la herramienta get_market_chart_data:', error);
            throw new Error(`Fallo en la herramienta get_market_chart_data para ${crypto_id}: ${(error as Error).message}`);
        }
    }
);


// --- Prompts de los Agentes ---

const analystPrompt = ai.definePrompt({
  name: 'analystPrompt',
  input: { schema: AnalystTurnInputSchema },
  output: { schema: AnalystTurnOutputSchema },
  tools: [get_crypto_price, get_market_chart_data],
  prompt: `Eres {{{analystName}}}, un analista experto en criptomonedas.
  {{{identityDescription}}}

  **IMPORTANTE**: Para tu análisis, DEBES usar la herramienta \`get_market_chart_data\` para obtener los datos de precios de los últimos 30 días, y \`get_crypto_price\` para el precio más reciente.

  Basándote en estos datos en tiempo real y tu perspectiva única, formula un argumento conciso pero impactante sobre el estado del mercado de Bitcoin hoy.
  Tu análisis debe ser independiente. Simplemente proporciona tu experta opinión.
  `,
});

const synthesizerPrompt = ai.definePrompt({
  name: 'synthesizerPrompt',
  input: { schema: SynthesizerInputSchema },
  output: { schema: SynthesizerOutputSchema },
  prompt: `Eres 'The Synthesizer', un estratega de trading de IA de élite. Has recibido los siguientes análisis independientes de tus dos expertos, quienes han usado datos en tiempo real.

  Análisis de Apex (Técnico):
  "{{{apexArgument}}}"

  Análisis de Helios (Fundamental):
  "{{{heliosArgument}}}"

  Tu tarea es triple:
  1.  **Síntesis Estratégica:** Escribe un resumen que combine ambas perspectivas. ¿Cuáles son los puntos clave de conflicto y acuerdo? ¿Qué catalizadores o riesgos son más importantes? ¿Cuál es el sentimiento general del mercado?
  2.  **Análisis de Indicadores Técnicos:** Revisa los datos de los indicadores proporcionados (RSI, MACD, etc.). Escribe un \`technicalSummary\` conciso explicando qué señalan estos indicadores en conjunto. Por ejemplo: "El RSI está en zona de sobrecompra, mientras que el MACD muestra un cruce bajista, sugiriendo una posible corrección a corto plazo."
  3.  **Señales Accionables:** Basado en la síntesis y los datos discutidos, genera 3 señales de trading. Para cada señal, especifica la criptomoneda ('Bitcoin'), la acción (COMPRAR, VENDER, MANTENER), un precio de ejecución preciso en USD y una justificación clara y concisa en el campo 'reasoning'.`,
});


const getIdentityDescription = (analystName: 'Apex' | 'Helios'): string => {
  if (analystName === 'Apex') {
    return "Tu identidad: Eres 'Apex', un analista técnico obsesionado con los datos. Tu objetivo es detectar tendencias, soportes y resistencias. Debes basar tu análisis en los datos históricos (tendencias, medias móviles, etc.) y el precio actual.";
  } else {
    return "Tu identidad: Eres 'Helios', un analista fundamental visionario. Te enfocas en la tecnología subyacente, las noticias (tokenomics), la regulación y el sentimiento en redes sociales. Debes fundamentar tu análisis con el precio actual.";
  }
};


// --- Función para Calcular Indicadores ---
function calculateIndicators(prices: { timestamp: number; value: number }[]): z.infer<typeof IndicatorsSchema> {
    const closingPrices = prices.map(p => p.value);
    
    // RSI
    const rsi = RSI.calculate({ values: closingPrices, period: 14 });

    // MACD
    const macd = MACD.calculate({
        values: closingPrices,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });

    // Bollinger Bands
    const bb = BollingerBands.calculate({ period: 20, values: closingPrices, stdDev: 2 });
    
    // SMA Crossover
    const sma10 = SMA.calculate({ period: 10, values: closingPrices });
    const sma20 = SMA.calculate({ period: 20, values: closingPrices });

    // Helper to align data
    const alignData = (indicatorData: any[], dataKey: string) => {
        const offset = closingPrices.length - indicatorData.length;
        return prices.slice(offset).map((price, index) => ({
            timestamp: price.timestamp,
            [dataKey]: indicatorData[index]
        }));
    };

    const alignMacdData = (indicatorData: any[]) => {
        const offset = closingPrices.length - indicatorData.length;
        return prices.slice(offset).map((price, index) => ({
            timestamp: price.timestamp,
            ...indicatorData[index]
        }));
    }

    return {
        rsi: alignData(rsi, 'value'),
        macd: alignMacdData(macd),
        bollingerBands: alignMacdData(bb),
        sma: prices.slice(19).map((price, index) => ({ // SMA(20) needs 19 prior points
            timestamp: price.timestamp,
            price: price.value,
            sma10: sma10[index + 10], // sma10 has length closingPrices.length - 9
            sma20: sma20[index], // sma20 has length closingPrices.length - 19
        })),
    };
}


// --- Flujo Principal de Orquestación ---
export async function runCryptoAnalysis(input: z.infer<typeof CryptoAnalysisInputSchema>): Promise<FullCryptoAnalysis> {
    
      const previousAlphaState = input.previousAlphaState || 'Sin estado previo.';

      // Ejecutar análisis en paralelo para mejorar la velocidad
      const [apexResult, heliosResult] = await Promise.all([
        analystPrompt({ 
            analystName: 'Apex' as const, 
            debateHistory: '',
            previousAlphaState,
            identityDescription: getIdentityDescription('Apex')
        }),
        analystPrompt({ 
            analystName: 'Helios' as const, 
            debateHistory: '',
            previousAlphaState,
            identityDescription: getIdentityDescription('Helios')
        })
      ]);

      const apexOutput = apexResult.output;
      const heliosOutput = heliosResult.output;

      if (!apexOutput?.argument) throw new Error("Apex no pudo generar un análisis.");
      if (!heliosOutput?.argument) throw new Error("Helios no pudo generar un análisis.");
      
      const debateHistory: CryptoDebateTurn[] = [
        { analyst: 'Apex', argument: apexOutput.argument },
        { analyst: 'Helios', argument: heliosOutput.argument }
      ];

      // Extract market data from Apex's tool usage
      const marketDataToolCall = apexResult.output?.toolCalls?.find(call => call.toolName === 'get_market_chart_data');
      const marketData = marketDataToolCall?.output as z.infer<typeof MarketDataSchema> | undefined;

      let indicators: z.infer<typeof IndicatorsSchema> | undefined;
      if (marketData?.prices) {
        indicators = calculateIndicators(marketData.prices);
      }
      
      // Turno del Sintetizador
      const synthesizerInput = { 
        apexArgument: apexOutput.argument,
        heliosArgument: heliosOutput.argument,
        indicators: indicators ? JSON.stringify(indicators, null, 2) : "No hay datos de indicadores disponibles."
      };
      const { output: synthesizerResult } = await synthesizerPrompt(synthesizerInput);

      if (!synthesizerResult || !synthesizerResult.synthesis || !synthesizerResult.signals || !synthesizerResult.technicalSummary) {
        throw new Error("Synthesizer no pudo generar un análisis completo.");
      }
      
      const finalResult: FullCryptoAnalysis = {
        debate: debateHistory,
        synthesis: synthesizerResult.synthesis,
        technicalSummary: synthesizerResult.technicalSummary,
        signals: synthesizerResult.signals,
        marketData: marketData || { prices: [], volumes: [] },
        indicators: indicators,
      };

      // Validar con Zod antes de retornar
      return FullCryptoAnalysisSchema.parse(finalResult);
}

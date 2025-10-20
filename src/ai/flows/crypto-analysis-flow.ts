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
  IndicatorsSchema,
  CoinSchema
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
        description: 'Obtiene datos históricos del mercado (precio, volumen) para una criptomoneda durante un número específico de días, con granularidad diaria.',
        inputSchema: z.object({
            crypto_id: z.string().describe("El ID de la criptomoneda según CoinGecko (ej: 'bitcoin', 'ethereum')."),
            days: z.number().describe("El número de días para obtener datos (ej: 7, 30, 90).")
        }),
        outputSchema: MarketDataSchema,
    },
    async ({ crypto_id, days }) => {
        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/coins/${crypto_id}/market_chart?vs_currency=usd&days=${days}&interval=daily`);
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

const get_coin_list = ai.defineTool({
    name: 'get_coin_list',
    description: 'Obtiene una lista de las 100 principales criptomonedas por capitalización de mercado.',
    inputSchema: z.object({}),
    outputSchema: z.object({ output: z.array(CoinSchema) }),
}, async () => {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false');
        if (!response.ok) {
            throw new Error(`Error al contactar la API de lista de monedas: ${response.statusText}`);
        }
        const data = await response.json();
        const coinList = data.map((coin: any) => ({
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
        }));
        return { output: coinList };
    } catch (error) {
        console.error('Error en la herramienta get_coin_list:', error);
        throw new Error(`Fallo en la herramienta get_coin_list: ${(error as Error).message}`);
    }
});


// --- Prompts de los Agentes ---

const analystPrompt = ai.definePrompt({
  name: 'analystPrompt',
  input: { schema: AnalystTurnInputSchema },
  output: { schema: AnalystTurnOutputSchema },
  tools: [get_crypto_price, get_market_chart_data],
  prompt: `Eres {{{analystName}}}, un analista experto en criptomonedas para {{{cryptoName}}}.
  {{{identityDescription}}}

  **IMPORTANTE**: Para tu análisis, DEBES usar la herramienta \`get_market_chart_data\` para obtener los datos de precios de los últimos {{{days}}} días, y \`get_crypto_price\` para el precio más reciente.

  Basándote en estos datos en tiempo real y tu perspectiva única, formula un argumento conciso pero impactante sobre el estado del mercado de {{{cryptoName}}} hoy.
  Tu análisis debe ser independiente. Simplemente proporciona tu experta opinión.
  `,
});

const synthesizerPrompt = ai.definePrompt({
  name: 'synthesizerPrompt',
  input: { schema: SynthesizerInputSchema },
  output: { schema: SynthesizerOutputSchema },
  prompt: `Eres 'The Synthesizer', un estratega de trading de IA de élite. Has recibido los siguientes análisis independientes de tus dos expertos para {{{cryptoName}}}, quienes han usado datos en tiempo real.

  Análisis de Apex (Técnico):
  "{{{apexArgument}}}"

  Análisis de Helios (Fundamental):
  "{{{heliosArgument}}}"

  **Resumen del Análisis Técnico Cuantitativo:**
  "{{{technicalSummary}}}"

  Tu tarea es doble:
  1.  **Síntesis Estratégica:** Escribe un resumen que combine las perspectivas de Apex, Helios y el resumen técnico. ¿Cuáles son los puntos clave de conflicto y acuerdo? ¿Qué catalizadores o riesgos son más importantes? ¿Cuál es el sentimiento general del mercado?
  2.  **Señales Accionables:** Basado en la síntesis y los datos discutidos, genera hasta 3 señales de trading. Para cada señal, especifica la criptomoneda ('{{{cryptoName}}}'), la acción (COMPRAR, VENDER, MANTENER), un precio de ejecución preciso en USD y una justificación clara y concisa en el campo 'reasoning'.`,
});


const getIdentityDescription = (analystName: 'Apex' | 'Helios'): string => {
  if (analystName === 'Apex') {
    return "Tu identidad: Eres 'Apex', un analista técnico obsesionado con los datos. Tu objetivo es detectar tendencias, soportes y resistencias. Debes basar tu análisis en los datos históricos (tendencias, medias móviles, etc.) y el precio actual.";
  } else {
    return "Tu identidad: Eres 'Helios', un analista fundamental visionario. Te enfocas en la tecnología subyacente, las noticias (tokenomics), la regulación y el sentimiento en redes sociales. Debes fundamentar tu análisis con el precio actual.";
  }
};


function calculateIndicators(prices: { timestamp: number; value: number }[], volumes: { timestamp: number; value: number }[]): z.infer<typeof IndicatorsSchema> {
    const closingPrices = prices.map(p => p.value);
    
    if (closingPrices.length < 20) { // Not enough data for some indicators
        return null;
    }
    
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

    const alignData = (indicatorData: any[], dataKey: string) => {
        if (!indicatorData) return [];
        const offset = closingPrices.length - indicatorData.length;
        return prices.slice(offset).map((price, index) => ({
            timestamp: price.timestamp,
            [dataKey]: indicatorData[index]
        }));
    };

    const alignMacdData = (indicatorData: any[]) => {
        if (!indicatorData) return [];
        const offset = closingPrices.length - indicatorData.length;
        return prices.slice(offset).map((price, index) => ({
            timestamp: price.timestamp,
            ...(indicatorData[index] || {})
        }));
    }
    
    const volumeMap = new Map(volumes.map(v => [v.timestamp, v.value]));

    return {
        rsi: alignData(rsi, 'value'),
        macd: alignMacdData(macd),
        bollingerBands: alignMacdData(bb),
        sma: prices.slice(19).map((price, index) => ({
            timestamp: price.timestamp,
            price: price.value,
            sma10: sma10[index + 10], 
            sma20: sma20[index],
            volume: volumeMap.get(price.timestamp) || 0,
        })),
    };
}

export async function runCryptoAnalysis(input: z.infer<typeof CryptoAnalysisInputSchema>): Promise<FullCryptoAnalysis> {
    
      const previousAlphaState = input.previousAlphaState || 'Sin estado previo.';
      const cryptoName = input.crypto_id.charAt(0).toUpperCase() + input.crypto_id.slice(1);

      const [apexResult, heliosResult, marketDataResult] = await Promise.all([
        analystPrompt({ 
            analystName: 'Apex' as const, 
            cryptoName,
            days: input.days,
            debateHistory: '',
            previousAlphaState,
            identityDescription: getIdentityDescription('Apex')
        }),
        analystPrompt({ 
            analystName: 'Helios' as const, 
            cryptoName,
            days: input.days,
            debateHistory: '',
            previousAlphaState,
            identityDescription: getIdentityDescription('Helios')
        }),
        get_market_chart_data({ crypto_id: input.crypto_id, days: input.days })
      ]);

      const apexOutput = apexResult.output;
      const heliosOutput = heliosResult.output;

      if (!apexOutput?.argument) throw new Error("Apex no pudo generar un análisis.");
      if (!heliosOutput?.argument) throw new Error("Helios no pudo generar un análisis.");
      if (!marketDataResult) throw new Error("No se pudieron obtener los datos de mercado.");
      
      const debateHistory: CryptoDebateTurn[] = [
        { analyst: 'Apex', argument: apexOutput.argument },
        { analyst: 'Helios', argument: heliosOutput.argument }
      ];

      const marketData = marketDataResult as z.infer<typeof MarketDataSchema>;

      let indicators: z.infer<typeof IndicatorsSchema> = null;
      if (marketData?.prices && marketData?.volumes) {
        indicators = calculateIndicators(marketData.prices, marketData.volumes);
      }
      
      // Generate a simple text summary of indicators
      let technicalSummary = "No hay suficientes datos para un resumen técnico.";
      if (indicators && indicators.rsi.length > 0 && indicators.macd.length > 0) {
          const lastRsi = indicators.rsi[indicators.rsi.length - 1].value;
          const lastMacd = indicators.macd[indicators.macd.length - 1];
          technicalSummary = `El RSI actual es ${lastRsi.toFixed(2)}. `;
          if (lastRsi > 70) technicalSummary += "Zona de sobrecompra. ";
          if (lastRsi < 30) technicalSummary += "Zona de sobreventa. ";
          if (lastMacd.histogram > 0) {
              technicalSummary += "El histograma MACD es positivo, indicando momentum alcista.";
          } else {
              technicalSummary += "El histograma MACD es negativo, indicando momentum bajista.";
          }
      }

      const synthesizerInput = { 
        cryptoName,
        apexArgument: apexOutput.argument,
        heliosArgument: heliosOutput.argument,
        technicalSummary,
      };
      const { output: synthesizerResult } = await synthesizerPrompt(synthesizerInput);

      if (!synthesizerResult || !synthesizerResult.synthesis || !synthesizerResult.signals) {
        throw new Error("Synthesizer no pudo generar un análisis completo.");
      }
      
      const finalResult: FullCryptoAnalysis = {
        debate: debateHistory,
        synthesis: synthesizerResult.synthesis,
        technicalSummary: synthesizerResult.technicalSummary || technicalSummary, // Use generated summary as fallback
        signals: synthesizerResult.signals,
        marketData: marketData || null,
        indicators: indicators,
      };

      return FullCryptoAnalysisSchema.parse(finalResult);
}


export async function getCoinList(): Promise<z.infer<typeof CoinSchema>[]> {
    const { output } = await get_coin_list({});
    if (!output) throw new Error("No se pudo obtener la lista de monedas.");
    return output.output;
}

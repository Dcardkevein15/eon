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
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${crypto_id}&vs_currencies=usd`;
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });

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

const get_market_chart_data = ai.defineTool({
    name: 'get_market_chart_data',
    description: 'Obtiene datos históricos de precios y volúmenes para una criptomoneda en un rango de días específico.',
    inputSchema: z.object({
        crypto_id: z.string().describe("El ID de la criptomoneda (ej: 'bitcoin')."),
        days: z.number().describe("El número de días para los datos históricos."),
    }),
    outputSchema: MarketDataSchema,
}, async ({ crypto_id, days }) => {
    try {
        const interval = days < 2 ? 'hourly' : 'daily';
        const url = `https://api.coingecko.com/api/v3/coins/${crypto_id}/market_chart?vs_currency=usd&days=${days}&interval=${interval}`;
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        
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
});


const get_coin_list = ai.defineTool({
    name: 'get_coin_list',
    description: 'Obtiene una lista de las 100 principales criptomonedas por capitalización de mercado.',
    inputSchema: z.object({}),
    outputSchema: z.array(CoinSchema),
}, async () => {
    try {
        const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false`;
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });

        if (!response.ok) {
            throw new Error(`Error al contactar la API de lista de monedas: ${response.statusText}`);
        }
        const data = await response.json();
        return data.map((coin: any) => ({
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
        }));
    } catch (error) {
        console.error('Error en la herramienta get_coin_list:', error);
        throw new Error(`Fallo en la herramienta get_coin_list: ${(error as Error).message}`);
    }
});


// --- Prompts de los Agentes ---

const apexPrompt = ai.definePrompt({
  name: 'apexPrompt',
  input: { schema: AnalystTurnInputSchema },
  output: { schema: AnalystTurnOutputSchema },
  tools: [get_crypto_price, get_market_chart_data],
  prompt: `Eres 'Apex', un analista técnico de criptomonedas obsesionado con los datos para {{{cryptoName}}}.

  **TAREA OBLIGATORIA:**
  1.  USA la herramienta \`get_market_chart_data\` para obtener los datos de mercado de los últimos {{{days}}} días para {{{cryptoName}}}.
  2.  USA la herramienta \`get_crypto_price\` para obtener el precio más reciente.

  Una vez que tengas todos los datos, formula un argumento conciso pero impactante sobre el estado del mercado de {{{cryptoName}}} hoy, basándote en tu análisis de patrones de gráficos, soportes, resistencias y momentum.

  Tu análisis debe ser independiente. Simplemente proporciona tu experta opinión técnica.`,
});

const heliosPrompt = ai.definePrompt({
  name: 'heliosPrompt',
  input: { schema: AnalystTurnInputSchema },
  output: { schema: AnalystTurnOutputSchema },
  tools: [get_crypto_price],
  prompt: `Eres 'Helios', un analista fundamental de criptomonedas visionario para {{{cryptoName}}}.

  **IMPORTANTE**: Para tu análisis, DEBES usar la herramienta \`get_crypto_price\` para el precio más reciente.
  
  Tu análisis se centra en la tecnología subyacente, noticias, tokenomics, regulación y sentimiento en redes sociales. Formula un argumento conciso sobre el estado del mercado de {{{cryptoName}}} hoy desde una perspectiva fundamental, fundamentado con el precio actual.`,
});

const synthesizerPrompt = ai.definePrompt({
  name: 'synthesizerPrompt',
  input: { schema: SynthesizerInputSchema },
  output: { schema: SynthesizerOutputSchema },
  prompt: `Eres 'The Synthesizer', un estratega de trading de IA de élite. Has recibido los siguientes análisis independientes de tus dos expertos para {{{cryptoName}}}.

  Análisis de Apex (Técnico):
  "{{{apexArgument}}}"

  Análisis de Helios (Fundamental):
  "{{{heliosArgument}}}"

  **Resumen del Análisis Técnico Cuantitativo:**
  "{{{technicalSummary}}}"

  Tu tarea es doble:
  1.  **Síntesis Estratégica:** Escribe un resumen que combine las perspectivas de Apex, Helios y el resumen técnico. ¿Cuáles son los puntos clave de conflicto y acuerdo? ¿Qué catalizadores o riesgos son más importantes? ¿Cuál es el sentimiento general del mercado?
  2.  **Señales Accionables:** Basado en la síntesis y los datos discutidos, genera hasta 3 señales de trading. Para cada señal, especifica la criptomoneda ('{{{cryptoName}}}'), la acción (COMPRAR, VENDER, MANTENER), un precio de ejecución preciso en USD (o 0 para MANTENER) y una justificación clara y concisa en el campo 'reasoning'.`,
});


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
    
      const cryptoName = input.crypto_id.charAt(0).toUpperCase() + input.crypto_id.slice(1);
      
      const apexResult = await apexPrompt({ 
          analystName: 'Apex' as const, 
          cryptoName,
          days: input.days,
          debateHistory: '',
          identityDescription: '',
          previousAlphaState: '',
          technicalSummary: '',
      });

      const apexOutput = apexResult.output;
      if (!apexOutput?.argument) throw new Error("Apex no pudo generar un análisis.");
      
      const apexToolsOutput = apexResult.toolRequests[0]?.output as (z.infer<typeof MarketDataSchema> | undefined);
      if (!apexToolsOutput) throw new Error("Apex no obtuvo los datos del mercado.");
      const marketData = apexToolsOutput;
      
      let indicators: z.infer<typeof IndicatorsSchema> = null;
      if (marketData?.prices && marketData?.volumes) {
        indicators = calculateIndicators(marketData.prices, marketData.volumes);
      }
      
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
      
      const heliosResult = await heliosPrompt({ 
          analystName: 'Helios' as const, 
          cryptoName,
          days: input.days,
          debateHistory: '',
          identityDescription: '',
          previousAlphaState: '',
          technicalSummary: '',
      });
      const heliosOutput = heliosResult.output;
      if (!heliosOutput?.argument) throw new Error("Helios no pudo generar un análisis.");
      
      const debateHistory: CryptoDebateTurn[] = [
        { analyst: 'Apex', argument: apexOutput.argument },
        { analyst: 'Helios', argument: heliosOutput.argument }
      ];

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
        technicalSummary: synthesizerResult.technicalSummary || technicalSummary,
        signals: synthesizerResult.signals,
        marketData: marketData || null,
        indicators: indicators,
      };

      return FullCryptoAnalysisSchema.parse(finalResult);
}


export async function getCoinList(): Promise<z.infer<typeof CoinSchema>[]> {
    return await get_coin_list({});
}

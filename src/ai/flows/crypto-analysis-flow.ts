'use server';
/**
 * @fileOverview Flujo de análisis de criptomonedas.
 * Obtiene datos de mercado, calcula indicadores, simula un debate entre
 * dos analistas de IA (técnico y fundamental) y un tercer agente sintetiza
 * sus conclusiones en señales de trading.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  CryptoAnalysisInputSchema,
  SynthesizerInputSchema,
  SynthesizerOutputSchema,
  type CryptoDebateTurn,
  type FullCryptoAnalysis,
  FullCryptoAnalysisSchema,
  MarketDataSchema,
  IndicatorsSchema,
  CoinSchema
} from '@/lib/types';
import { SMA, MACD, RSI, BollingerBands } from 'technicalindicators';

// --- Función de obtención de datos ---
// Se mantiene como una función interna, no una herramienta.
async function fetchMarketData(crypto_id: string, days: number): Promise<z.infer<typeof MarketDataSchema>> {
    try {
        const interval = days < 2 ? 'hourly' : 'daily';
        const url = `https://api.coingecko.com/api/v3/coins/${crypto_id}/market_chart?vs_currency=usd&days=${days}&interval=${interval}`;
        
        // Incluir la cabecera User-Agent es crucial para evitar bloqueos.
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });

        if (!response.ok) {
            // Lanzar un error claro si la respuesta no es exitosa.
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
        console.error('Error en fetchMarketData:', error);
        // Envolver el error para dar más contexto.
        throw new Error(`Fallo al obtener datos de mercado para ${crypto_id}: ${(error as Error).message}`);
    }
}

// --- Herramientas ---

// Herramienta para obtener la lista de monedas
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


// Herramienta de análisis técnico que recibe datos y devuelve un argumento.
const get_technical_analysis = ai.defineTool({
    name: 'get_technical_analysis',
    description: 'Realiza un análisis técnico basado en datos de precios y volumen y devuelve un argumento.',
    inputSchema: z.object({
        cryptoName: z.string(),
        technicalSummary: z.string(),
    }),
    outputSchema: z.string(),
}, async ({ cryptoName, technicalSummary }) => {
    const { text } = await ai.generate({
        prompt: `Eres 'Apex', un analista técnico de criptomonedas para ${cryptoName}.

          **Resumen del Análisis Técnico Cuantitativo:**
          "${technicalSummary}"
          
          Basándote EXCLUSIVAMENTE en el resumen técnico proporcionado, formula un argumento conciso pero impactante sobre el estado del mercado de ${cryptoName} hoy, enfocándote en patrones de gráficos, soportes, resistencias y momentum.
          
          Tu análisis debe ser independiente. Simplemente proporciona tu experta opinión técnica.`
    });
    return text;
});


// Herramienta de análisis fundamental que devuelve un argumento.
const get_fundamental_analysis = ai.defineTool({
    name: 'get_fundamental_analysis',
    description: 'Realiza un análisis fundamental y de sentimiento para una criptomoneda y devuelve un argumento.',
    inputSchema: z.object({ cryptoName: z.string() }),
    outputSchema: z.string(),
}, async ({ cryptoName }) => {
    const { text } = await ai.generate({
        prompt: `Eres 'Helios', un analista fundamental de criptomonedas visionario para ${cryptoName}.
      
          Tu análisis se centra en la tecnología subyacente, noticias, tokenomics, regulación y sentimiento en redes sociales. 
          Formula un argumento conciso sobre el estado del mercado de ${cryptoName} hoy desde una perspectiva fundamental. No tienes acceso a datos de precios en tiempo real.`
    });
    return text;
});

// --- Prompts ---

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
  2.  **Señales Accionables:** Basado en la síntesis y los datos discutidos, genera hasta 3 señales de trading. Para cada señal, especifica la criptomoneda ('{{{cryptoName}}}'), la acción (COMPRAR, VENDER, MANTENER), un precio de ejecución preciso en USD (o un guion '-' para MANTENER) y una justificación clara y concisa en el campo 'reasoning'.`,
});


const orchestratorPrompt = ai.definePrompt({
    name: 'orchestratorPrompt',
    description: 'Orquesta a los analistas y al sintetizador para generar un análisis completo.',
    tools: [get_technical_analysis, get_fundamental_analysis],
    input: {
        schema: z.object({
            cryptoName: z.string(),
            technicalSummary: z.string(),
        }),
    },
    output: { schema: z.object({ apexArgument: z.string(), heliosArgument: z.string() }) },
    prompt: `Tu tarea es orquestar el análisis para {{cryptoName}}.

    1. Llama a la herramienta 'get_technical_analysis' con el resumen técnico proporcionado.
    2. Llama a la herramienta 'get_fundamental_analysis'.
    3. Devuelve los argumentos de ambos analistas.`,
});


// --- Funciones de Cálculo y Flujo Principal ---

function calculateIndicators(prices: { timestamp: number; value: number }[], volumes: { timestamp: number; value: number }[]): z.infer<typeof IndicatorsSchema> {
    const closingPrices = prices.map(p => p.value);
    
    if (closingPrices.length < 20) {
        return null;
    }
    
    const rsi = RSI.calculate({ values: closingPrices, period: 14 });
    const macd = MACD.calculate({
        values: closingPrices,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });
    const bb = BollingerBands.calculate({ period: 20, values: closingPrices, stdDev: 2 });
    const sma10 = SMA.calculate({ period: 10, values: closingPrices });
    const sma20 = SMA.calculate({ period: 20, values: closingPrices });

    const alignData = (indicatorData: any[], dataKey: string) => {
        if (!indicatorData || indicatorData.length === 0) return [];
        const offset = closingPrices.length - indicatorData.length;
        return prices.slice(offset).map((price, index) => ({
            timestamp: price.timestamp,
            [dataKey]: indicatorData[index]
        }));
    };

    const alignMacdData = (indicatorData: any[]) => {
        if (!indicatorData || indicatorData.length === 0) return [];
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
      
      // 1. Obtener datos de mercado directamente. Esta es la única llamada de red externa.
      const marketData = await fetchMarketData(input.crypto_id, input.days);
      
      // 2. Calcular indicadores
      const indicators = calculateIndicators(marketData.prices, marketData.volumes);
      
      // 3. Crear resumen técnico para la IA
      let technicalSummary = "No hay suficientes datos para un resumen técnico.";
      if (indicators && indicators.rsi.length > 0 && indicators.macd.length > 0) {
          const lastRsi = indicators.rsi[indicators.rsi.length - 1].value;
          const lastMacd = indicators.macd[indicators.macd.length - 1];
          technicalSummary = `El RSI actual es ${lastRsi.toFixed(2)}. `;
          if (lastRsi > 70) technicalSummary += "Zona de sobrecompra. ";
          if (lastRsi < 30) technicalSummary += "Zona de sobreventa. ";
          
          if (lastMacd.histogram && lastMacd.histogram > 0) {
              technicalSummary += "El histograma MACD es positivo, indicando momentum alcista.";
          } else if (lastMacd.histogram) {
              technicalSummary += "El histograma MACD es negativo, indicando momentum bajista.";
          }
      }
      
      // 4. Invocar al orquestador para obtener los argumentos de los analistas
      const { output: analystOutputs } = await orchestratorPrompt({ cryptoName, technicalSummary });
      if (!analystOutputs?.apexArgument || !analystOutputs?.heliosArgument) {
          throw new Error("El orquestador no pudo obtener los argumentos de los analistas.");
      }
      
      const debateHistory: CryptoDebateTurn[] = [
        { analyst: 'Apex', argument: analystOutputs.apexArgument },
        { analyst: 'Helios', argument: analystOutputs.heliosArgument }
      ];

      // 5. Invocar al sintetizador con los argumentos y el resumen
      const synthesizerInput = { 
        cryptoName,
        apexArgument: analystOutputs.apexArgument,
        heliosArgument: analystOutputs.heliosArgument,
        technicalSummary,
      };
      const { output: synthesizerResult } = await synthesizerPrompt(synthesizerInput);

      if (!synthesizerResult || !synthesizerResult.synthesis || !synthesizerResult.signals) {
        throw new Error("Synthesizer no pudo generar un análisis completo.");
      }
      
      // 6. Construir el resultado final
      const finalResult: FullCryptoAnalysis = {
        debate: debateHistory,
        synthesis: synthesizerResult.synthesis,
        technicalSummary: synthesizerResult.technicalSummary || technicalSummary,
        signals: synthesizerResult.signals.map(s => ({
            ...s,
            price: typeof s.price === 'number' ? s.price : 0
        })),
        marketData: marketData,
        indicators: indicators,
      };

      return FullCryptoAnalysisSchema.parse(finalResult);
}


// Función exportada para obtener la lista de monedas, que llama a la herramienta.
export async function getCoinList(): Promise<z.infer<typeof CoinSchema>[]> {
    return await get_coin_list({});
}

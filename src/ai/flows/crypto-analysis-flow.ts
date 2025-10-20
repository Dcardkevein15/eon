'use server';
/**
 * @fileOverview Flujo de análisis de criptomonedas.
 * Simula un debate entre dos analistas de IA (técnico y fundamental)
 * y un tercer agente sintetiza sus conclusiones en señales de trading.
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

// --- Herramientas ---

// Herramienta para obtener la lista de monedas (Hardcodeada para evitar llamadas a API)
const get_coin_list = ai.defineTool({
    name: 'get_coin_list',
    description: 'Obtiene una lista de las principales criptomonedas.',
    inputSchema: z.object({}),
    outputSchema: z.array(CoinSchema),
}, async () => {
    // Retornamos una lista estática para evitar fallos de API.
    return [
      { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' },
      { id: 'ethereum', symbol: 'eth', name: 'Ethereum' },
      { id: 'tether', symbol: 'usdt', name: 'Tether' },
      { id: 'binancecoin', symbol: 'bnb', name: 'BNB' },
      { id: 'solana', symbol: 'sol', name: 'Solana' },
      { id: 'ripple', symbol: 'xrp', name: 'XRP' },
      { id: 'cardano', symbol: 'ada', name: 'Cardano' },
      { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin' },
      { id: 'stellar', symbol: 'xlm', name: 'Stellar' },
    ];
});


// Herramienta de análisis técnico que devuelve un argumento.
const get_technical_analysis = ai.defineTool({
    name: 'get_technical_analysis',
    description: 'Realiza un análisis técnico basado en conocimiento general y devuelve un argumento.',
    inputSchema: z.object({ cryptoName: z.string() }),
    outputSchema: z.string(),
}, async ({ cryptoName }) => {
    const { text } = await ai.generate({
        prompt: `Eres 'Apex', un analista técnico de criptomonedas para ${cryptoName}.

          Basándote en tu conocimiento general de análisis técnico (patrones de gráficos, soportes, resistencias, momentum histórico), formula un argumento conciso pero impactante sobre el estado del mercado de ${cryptoName} hoy.
          
          Tu análisis debe ser independiente. Simplemente proporciona tu experta opinión técnica cualitativa.`
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
      
          Tu análisis se centra en la tecnología subyacente, noticias recientes, tokenomics, regulación y sentimiento general en redes sociales. 
          Formula un argumento conciso sobre el estado del mercado de ${cryptoName} hoy desde una perspectiva fundamental.`
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

  Tu tarea es doble:
  1.  **Síntesis Estratégica:** Escribe un resumen que combine las perspectivas de Apex y Helios. ¿Cuáles son los puntos clave de conflicto y acuerdo? ¿Qué catalizadores o riesgos son más importantes? ¿Cuál es el sentimiento general del mercado?
  2.  **Señales Accionables:** Basado en la síntesis, genera hasta 3 señales de trading. Para cada señal, especifica la criptomoneda ('{{{cryptoName}}}'), la acción (COMPRAR, VENDER, MANTENER), y una justificación clara y concisa en el campo 'reasoning'. Como no tienes precios en tiempo real, usa un guion ('-') para el campo 'price'.`,
});


const orchestratorPrompt = ai.definePrompt({
    name: 'orchestratorPrompt',
    description: 'Orquesta a los analistas y al sintetizador para generar un análisis completo.',
    tools: [get_technical_analysis, get_fundamental_analysis],
    input: {
        schema: z.object({
            cryptoName: z.string(),
        }),
    },
    output: { schema: z.object({ apexArgument: z.string(), heliosArgument: z.string() }) },
    prompt: `Tu tarea es orquestar el análisis para {{cryptoName}}.

    1. Llama a la herramienta 'get_technical_analysis'.
    2. Llama a la herramienta 'get_fundamental_analysis'.
    3. Devuelve los argumentos de ambos analistas.`,
});


// --- Flujo Principal ---

export async function runCryptoAnalysis(input: z.infer<typeof CryptoAnalysisInputSchema>): Promise<FullCryptoAnalysis> {
      const cryptoName = input.crypto_id.charAt(0).toUpperCase() + input.crypto_id.slice(1);
      
      // 1. Invocar al orquestador para obtener los argumentos de los analistas
      const { output: analystOutputs } = await orchestratorPrompt({ cryptoName });
      if (!analystOutputs?.apexArgument || !analystOutputs?.heliosArgument) {
          throw new Error("El orquestador no pudo obtener los argumentos de los analistas.");
      }
      
      const debateHistory: CryptoDebateTurn[] = [
        { analyst: 'Apex', argument: analystOutputs.apexArgument },
        { analyst: 'Helios', argument: analystOutputs.heliosArgument }
      ];

      // 2. Invocar al sintetizador con los argumentos
      const synthesizerInput = { 
        cryptoName,
        apexArgument: analystOutputs.apexArgument,
        heliosArgument: analystOutputs.heliosArgument,
        technicalSummary: "El análisis técnico se basa en conocimiento general de patrones históricos, no en datos de mercado en tiempo real.",
      };
      const { output: synthesizerResult } = await synthesizerPrompt(synthesizerInput);

      if (!synthesizerResult || !synthesizerResult.synthesis || !synthesizerResult.signals) {
        throw new Error("Synthesizer no pudo generar un análisis completo.");
      }
      
      // 3. Construir el resultado final
      const finalResult: FullCryptoAnalysis = {
        debate: debateHistory,
        synthesis: synthesizerResult.synthesis,
        technicalSummary: synthesizerResult.technicalSummary,
        signals: synthesizerResult.signals.map(s => ({
            ...s,
            price: 0 // No hay precio real, se usa 0 como placeholder
        })),
        marketData: null, // No hay datos de mercado
        indicators: null,   // No hay indicadores
      };

      return FullCryptoAnalysisSchema.parse(finalResult);
}


// Función exportada para obtener la lista de monedas, que llama a la herramienta.
export async function getCoinList(): Promise<z.infer<typeof CoinSchema>[]> {
    return await get_coin_list({});
}

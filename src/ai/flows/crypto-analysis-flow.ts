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
      // Devolver un precio de -1 podría confundir a la IA. Mejor lanzar un error.
      throw new Error(`Fallo en la herramienta get_crypto_price para ${crypto_id}: ${(error as Error).message}`);
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

  **IMPORTANTE**: Para tu análisis, DEBES usar la herramienta \`get_crypto_price\` para obtener el precio actual de 'bitcoin'.

  Basándote en el precio actual y tu perspectiva única, formula un argumento conciso pero impactante sobre el estado del mercado de Bitcoin hoy.
  Tu análisis debe ser independiente y no necesitas interactuar con otros analistas. Simplemente proporciona tu experta opinión.
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

  Tu tarea es doble:
  1.  **Síntesis:** Escribe un resumen estratégico que combine ambas perspectivas. ¿Cuáles son los puntos clave de conflicto y acuerdo? ¿Qué catalizadores o riesgos son más importantes? ¿Cuál es el sentimiento general del mercado?
  2.  **Señales Accionables:** Basado en la síntesis y los datos discutidos, genera 3 señales de trading. Para cada señal, especifica la criptomoneda ('Bitcoin'), la acción (COMPRAR, VENDER, MANTENER), un precio de ejecución preciso en USD y una justificación clara y concisa en el campo 'reasoning'.`,
});


const getIdentityDescription = (analystName: 'Apex' | 'Helios'): string => {
  if (analystName === 'Apex') {
    return "Tu identidad: Eres 'Apex', un analista técnico obsesionado con los datos. Tu objetivo es detectar tendencias, soportes y resistencias. DEBES usar la herramienta `get_crypto_price` para el precio más reciente y basar tu análisis en él (tendencias, medias móviles, etc.).";
  } else {
    return "Tu identidad: Eres 'Helios', un analista fundamental visionario. Te enfocas en la tecnología subyacente, las noticias (tokenomics), la regulación y el sentimiento en redes sociales. DEBES usar la herramienta `get_crypto_price` para fundamentar tu análisis con el precio actual.";
  }
};


// Flujo Principal de Orquestación
export async function runCryptoAnalysis(input: z.infer<typeof CryptoAnalysisInputSchema>): Promise<FullCryptoAnalysis> {
    
      const previousAlphaState = input.previousAlphaState || 'Sin estado previo.';

      // Ejecutar análisis en paralelo para mejorar la velocidad
      const [apexResult, heliosResult] = await Promise.all([
        analystPrompt({ 
            analystName: 'Apex' as const, 
            debateHistory: '', // Ya no es un debate
            previousAlphaState,
            identityDescription: getIdentityDescription('Apex')
        }),
        analystPrompt({ 
            analystName: 'Helios' as const, 
            debateHistory: '', // Ya no es un debate
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
      
      // Turno del Sintetizador
      const synthesizerInput = { 
        apexArgument: apexOutput.argument,
        heliosArgument: heliosOutput.argument
      };
      const { output: synthesizerResult } = await synthesizerPrompt(synthesizerInput);

      if (!synthesizerResult || !synthesizerResult.synthesis || !synthesizerResult.signals) {
        throw new Error("Synthesizer no pudo generar un análisis completo.");
      }
      
      const finalResult: FullCryptoAnalysis = {
        debate: debateHistory,
        synthesis: synthesizerResult.synthesis,
        signals: synthesizerResult.signals,
      };

      // Validar con Zod antes de retornar
      return FullCryptoAnalysisSchema.parse(finalResult);
}

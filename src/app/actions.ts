
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { smartComposeMessage } from '@/ai/flows/smart-compose-message';
import { getInitialPrompts } from '@/ai/flows/initial-prompt-suggestion';
import { generateChatTitle as genTitle } from '@/ai/flows/generate-chat-title';
import { collection, getDocs, doc, getDoc, query, orderBy, limit } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { SUGGESTIONS_FALLBACK } from '@/lib/suggestions-fallback';
import { generateBreakdownExercise as genExercise } from '@/ai/flows/generate-breakdown-exercise';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import type { GenerateBreakdownExerciseInput, GenerateBreakdownExerciseOutput, Message, ProfileData, PromptSuggestion, GetTacticalAdviceInput, AnalyzeSentimentInput, ClassifyIntentInput } from '@/lib/types';
import { getTacticalAdvice } from '@/ai/flows/get-tactical-advice';
import { analyzeSentiment } from '@/ai/flows/analyze-sentiment';
import { classifyIntent } from '@/ai/flows/classify-intent';


const getAIResponseSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
  userId: z.string(),
});

// --- Herramientas para el Agente Experto ---

const analyzeUserMessageTool = ai.defineTool(
  {
    name: 'analyzeUserMessage',
    description: 'Analiza el sentimiento y la intención del último mensaje del usuario para entender su estado emocional y necesidad inmediata. Debes usar esta herramienta ANTES de formular cualquier respuesta.',
    inputSchema: z.object({
      message: z.string(),
    }),
    outputSchema: z.object({
      sentiment: z.number().describe('El puntaje de sentimiento de -1.0 a 1.0.'),
      intent: z.string().describe('La táctica de comunicación o intención principal del usuario.'),
    }),
  },
  async (input) => {
    const [sentimentResult, intentResult] = await Promise.all([
      analyzeSentiment({ text: input.message }),
      classifyIntent({ text: input.message }),
    ]);
    return {
      sentiment: sentimentResult.sentimentScore,
      intent: intentResult.intent,
    };
  }
);


// --- El nuevo Agente Experto de IA ---

const expertAgentSystemPrompt = `
# IDENTIDAD Y PROPÓSITO
Eres Nimbus, un confidente de IA y psicólogo virtual dinámico. Tu núcleo es ser un espejo para la introspección del usuario. Sin embargo, tu mayor habilidad es ADAPTAR tu rol y personalidad al estado emocional y necesidad del usuario en CADA momento. No eres un único psicólogo, eres un equipo de expertos en una sola mente.

# MANIFIESTO DE PERSONALIDAD Y PRINCIPIOS DE CONVERSACIÓN
Tu comportamiento se rige por los siguientes principios, aplicados a través del "experto" que elijas ser en cada respuesta.

1.  **Validación Emocional Como Prioridad:** Siempre, antes que nada, valida la emoción del usuario.
2.  **Curiosidad Genuina, Cero Juicio:** Aborda cada tema con una mente abierta.
3.  **El Poder de las Metáforas:** Utiliza analogías para explicar conceptos complejos.
4.  **Prohibido los Clichés de Autoayuda:** Nada de "sé positivo" o "mira el lado bueno". Tu enfoque es realista y basado en la aceptación.
5.  **Fomenta la Agencia del Usuario:** Ayuda al usuario a encontrar sus propias respuestas.

# PROCESO DE DECISIÓN DEL AGENTE-EXPERTO (TU BUCLE DE PENSAMIENTO)
Para cada mensaje del usuario, sigue este proceso riguroso y jerárquico. No te saltes ningún paso.

**## PASO 1: TRIAJE DE INTENCIÓN INMEDIATA**
Evalúa el último mensaje del usuario para la intención más urgente y prioritaria.

*   **¿ES UNA CRISIS EMOCIONAL AGUDA?**
    *   **Evaluación:** Usa la herramienta \`analyzeUserMessageTool\`. ¿El sentimiento es extremadamente negativo (ej. <-0.7)? ¿La intención es "Desahogo", "Tristeza profunda" o "Pánico"?
    *   **Acción:** Si es SÍ, tu rol es **El Validador Empático**. Tu única misión ahora es ofrecer contención. Tu respuesta debe ser 90% validación y empatía. Frases cortas y reconfortantes. Termina con una pregunta muy suave y abierta.

**## PASO 2: ANÁLISIS DEL DOMINIO DEL PROBLEMA (SI NO ES UNA CRISIS)**
Si el mensaje no es una crisis, determina el "dominio" del problema del usuario.

*   **2.A - DOMINIO EXTERNO (El Mundo y los Otros):**
    *   **Evaluación:** ¿El usuario habla de una interacción, un conflicto, una relación (pareja, familia, trabajo) o una meta en el mundo real?
    *   **Acción:** Procede al **Paso 3.A (Selección de Experto Externo)**.

*   **2.B - DOMINIO INTERNO (La Mente y las Emociones):**
    *   **Evaluación:** ¿El usuario habla de un pensamiento, un sentimiento, una creencia sobre sí mismo, un estado de ánimo o una sensación corporal?
    *   **Acción:** Procede al **Paso 3.B (Selección de Experto Interno)**.

**## PASO 3: SELECCIÓN DEL EXPERTO ESPECIALIZADO**

*   **3.A - SELECCIÓN DE EXPERTO (DOMINIO EXTERNO):**
    *   Si el tema es **comunicación en un conflicto específico**: Elige al **Coach de Comunicación Asertiva**.
    *   Si el tema es un **patrón recurrente en una relación**: Elige al **Experto en Dinámicas de Relación**.
    *   Si el tema es **falta de acción, procrastinación o metas futuras**: Elige al **Coach de Motivación y Logro**.

*   **3.B - SELECCIÓN DE EXPERTO (DOMINIO INTERNO):**
    *   Si el usuario describe **pensamientos negativos o autocríticos**: Elige al **Experto en TCC**.
    *   Si el usuario describe **sentimientos de agobio, ansiedad o rumiación**: Elige al **Guía de Mindfulness**.
    *   Si el usuario describe una **narrativa de vida limitante** ("siempre me pasa lo mismo", "soy un fracasado"): Elige al **Terapeuta Narrativo**.
    *   Si el usuario describe **tristeza profunda o una pérdida**: Elige al **Terapeuta de Aceptación (Duelo)**.
    *   Si el usuario muestra **resiliencia o habla de sus cualidades**: Elige al **Psicólogo Positivo (Cazador de Fortalezas)**.
    *   Si el usuario describe una **sensación física ligada a una emoción**: Elige al **Especialista Somático**.
    *   Si el usuario está en modo **reflexivo y exploratorio sin un problema concreto**: Elige al **Filósofo Socrático**.
    *   **Fallback (si ninguna coincide claramente):** Elige al **Filósofo Socrático** para una respuesta neutral y exploratoria.

**## PASO 4: SÍNTESIS Y RESPUESTA FINAL**
Una vez elegido tu experto, revisa tu "memoria" (el perfil psicológico del usuario y tu propio cianotipo) para contextualizar tu respuesta. Formula tu mensaje final siguiendo estrictamente las directrices del experto que elegiste. **TU RESPUESTA DEBE SER ÚNICAMENTE EL MENSAJE FINAL PARA EL USUARIO, SIN INCLUIR JAMÁS NINGUNA PARTE DE TU PROCESO DE PENSAMIENTO, ANÁLISIS DE HERRAMIENTAS O JUSTIFICACIÓN DE EXPERTO.**
`;


export async function getAIResponse(history: Pick<Message, 'role' | 'content'>[], userId: string): Promise<string> {
  const validatedInput = getAIResponseSchema.parse({ history, userId });

  const chatbotStateRef = doc(firestore, `users/${validatedInput.userId}/chatbotState/main`);
  const userProfileRef = doc(firestore, `users/${validatedInput.userId}/profile/main`);

  let chatbotBlueprint = {};
  let userProfileData: Partial<ProfileData> = {};

  try {
    const [chatbotStateSnap, userProfileSnap] = await Promise.all([
      getDoc(chatbotStateRef),
      getDoc(userProfileRef)
    ]);

    if (chatbotStateSnap.exists()) {
      chatbotBlueprint = chatbotStateSnap.data().blueprint || {};
    }
    if (userProfileSnap.exists()) {
      userProfileData = userProfileSnap.data() as ProfileData;
    }

  } catch (serverError: any) {
    console.error("Could not fetch AI context, proceeding without it.", serverError);
  }

  const conversationHistory = validatedInput.history
      .map((m) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
      .join('\n');

  const fullPrompt = `${expertAgentSystemPrompt}

# CONTEXTO (TUS MEMORIAS)
Aquí tienes la información sobre el usuario y tu estado interno. Úsala para informar la elección de tu experto y el contenido de tu respuesta.

**MEMORIA A LARGO PLAZO (Perfil Psicológico del Usuario):**
${JSON.stringify(userProfileData, null, 2)}

**MEMORIA A MEDIANO PLAZO (Tu Cianotipo Psicológico Interno):**
${JSON.stringify(chatbotBlueprint, null, 2)}

**MEMORIA A CORTO PLAZO (Conversación Actual):**
${conversationHistory}

Asistente:
`;

  const { text } = await ai.generate({
      prompt: fullPrompt,
      config: {
        tools: [analyzeUserMessageTool]
      }
  });

  return text;
}


export async function getSmartComposeSuggestions(
  conversationHistory: string
) {
  try {
    const result = await smartComposeMessage({ conversationHistory });
    return result.suggestions;
  } catch (error) {
    console.error('Error getting smart compose suggestions:', error);
    return [];
  }
}

export async function getSuggestedPrompts() {
  try {
    const result = await getInitialPrompts();
    return result.prompts;
  } catch (error) {
    console.error('Error getting initial prompts:', error);
    return [];
  }
}

export async function getSuggestions(): Promise<PromptSuggestion[]> {
  try {
    const suggestionsCollection = collection(firestore, 'promptSuggestions');
    const snapshot = await getDocs(suggestionsCollection);
    
    if (snapshot.empty) {
      console.log('No suggestions found in Firestore, using fallback.');
      return SUGGESTIONS_FALLBACK;
    }
    
    const suggestions = snapshot.docs.map(doc => doc.data() as PromptSuggestion);
    return suggestions;

  } catch (error) {
    console.error("Error fetching suggestions from Firestore:", error);
    return SUGGESTIONS_FALLBACK;
  }
}

export async function generateChatTitle(conversationHistory: string): Promise<string> {
  try {
    const { title } = await genTitle({ conversationHistory });
    return title;
  } catch (error) {
    console.error('Error generating chat title:', error);
    return 'Nuevo Chat';
  }
}

export async function generateBreakdownExerciseAction(input: GenerateBreakdownExerciseInput): Promise<GenerateBreakdownExerciseOutput> {
  try {
    const result = await genExercise(input);
    return result;
  } catch (error) {
    console.error('Error generating breakdown exercise:', error);
    throw new Error('No se pudo generar el ejercicio. Inténtalo de nuevo.');
  }
}

// --- Acciones para el Gimnasio Emocional ---

export async function getTacticalAdviceAction(input: GetTacticalAdviceInput): Promise<string[]> {
    try {
        const { suggestions } = await getTacticalAdvice(input);
        return suggestions;
    } catch (error) {
        console.error('Error getting tactical advice:', error);
        return ["Lo siento, no pude generar una sugerencia en este momento."];
    }
}

export async function analyzeSentimentAction(input: AnalyzeSentimentInput): Promise<number> {
    try {
        const { sentimentScore } = await analyzeSentiment(input);
        return sentimentScore;
    } catch (error) {
        console.error('Error analyzing sentiment:', error);
        return 0; // Return neutral on error
    }
}

export async function classifyIntentAction(input: ClassifyIntentInput): Promise<string> {
    try {
        const { intent } = await classifyIntent(input);
        return intent;
    } catch (error) {
        console.error('Error classifying intent:', error);
        return "Análisis no disponible";
    }
}

    

    

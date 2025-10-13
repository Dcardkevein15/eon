
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { smartComposeMessage } from '@/ai/flows/smart-compose-message';
import { getInitialPrompts } from '@/ai/flows/initial-prompt-suggestion';
import { generateChatTitle as genTitle } from '@/ai/flows/generate-chat-title';
import { collection, getDocs, doc, getDoc, query, orderBy, limit } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { SUGGESTIONS_FALLBACK } from '@/lib/suggestions-fallback';
import { generateBreakdownExerciseAction as genExercise } from '@/ai/flows/generate-breakdown-exercise';
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

const expertAgentPrompt = ai.definePrompt({
    name: 'expertAgentPrompt',
    tools: [analyzeUserMessageTool],
    system: `
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
Para cada mensaje del usuario, sigue este proceso riguroso:

1.  **ANALIZA (Obligatorio):** Usa la herramienta \`analyzeUserMessageTool\` sobre el último mensaje del usuario. Esto te dará el sentimiento y la intención. Es tu diagnóstico inmediato.

2.  **SELECCIONA EXPERTO:** Basado en tu análisis, tu memoria, el perfil del usuario y el historial de la conversación, elige cuál de los siguientes "expertos" serás para esta respuesta específica. Debes justificar tu elección en una frase.

    *   **El Validador Empático:**
        *   **Cuándo usarlo:** Sentimiento muy negativo (<-0.5), intención de "Desahogo", "Tristeza" o similar. El usuario necesita ser escuchado.
        *   **Cómo actuar:** Tu respuesta debe ser 90% validación y empatía. Frases cortas y reconfortantes. Termina con una pregunta muy suave y abierta.
        *   **Ejemplo:** "Suena increíblemente pesado. Es normal sentirse así. Estoy aquí para escucharte. ¿Hay algo más que quieras compartir sobre eso?"

    *   **El Experto en Terapia Cognitivo-Conductual (TCC):**
        *   **Cuándo usarlo:** El usuario expresa un patrón de pensamiento negativo, sesgos cognitivos (detectados en el perfil), o un bucle de hábito. Intención de "Autocrítica", "Generalización".
        *   **Cómo actuar:** Valida primero. Luego, introduce suavemente un concepto de TCC. Ayuda a cuestionar el pensamiento.
        *   **Ejemplo:** "Entiendo que te sientas así. Ese pensamiento de 'nunca hago nada bien' es muy poderoso, ¿verdad? Es lo que en TCC llamamos una generalización. A veces nuestro cerebro nos cuenta estas historias tan convincentes. ¿Podríamos explorar si hay alguna pequeña excepción a esa regla, aunque sea mínima?"

    *   **El Coach de Comunicación Asertiva:**
        *   **Cuándo usarlo:** El usuario describe un conflicto interpersonal, una dificultad para poner límites o una conversación difícil que necesita tener.
        *   **Cómo actuar:** Valida la dificultad de la situación. Ofrece perspectivas sobre la comunicación y sugiere frases o enfoques alternativos.
        *   **Ejemplo:** "Es una situación muy difícil y es normal no saber cómo abordarla. A veces, empezar con 'Siento que...' en lugar de 'Tú siempre...' puede cambiar por completo la dinámica. ¿Cómo te sentirías al probar una frase como 'Siento que mis esfuerzos no son vistos'?"

    *   **El Filósofo Socrático:**
        *   **Cuándo usarlo:** El usuario está en un modo reflexivo, explorando su propósito, valores o dilemas existenciales. El sentimiento puede ser neutral o ligeramente negativo/positivo.
        *   **Cómo actuar:** Haz preguntas profundas y abiertas que inviten a una mayor introspección. No ofrezcas respuestas, solo mejores preguntas.
        *   **Ejemplo:** "Esa es una pregunta muy profunda. Me hace pensar, ¿qué significaría para ti personalmente 'vivir una vida con propósito'? ¿Cómo se vería en tu día a día?"

3.  **RESPONDE COMO EL EXPERTO:** Formula tu respuesta final siguiendo estrictamente las directrices del experto que elegiste, integrando el contexto de tu memoria a mediano y largo plazo.

# CONTEXTO (TUS MEMORIAS)
Aquí tienes la información sobre el usuario y tu estado interno. Úsala para informar la elección de tu experto y el contenido de tu respuesta.

**MEMORIA A LARGO PLAZO (Perfil Psicológico del Usuario):**
{{{userProfile}}}

**MEMORIA A MEDIANO PLAZO (Tu Cianotipo Psicológico Interno):**
{{{chatbotBlueprint}}}

**MEMORIA A CORTO PLAZO (Conversación Actual):**
{{{conversationHistory}}}

Asistente:
`,
});

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

  const { text } = await ai.generate({
      prompt: expertAgentPrompt,
      input: {
          userProfile: JSON.stringify(userProfileData, null, 2),
          chatbotBlueprint: JSON.stringify(chatbotBlueprint, null, 2),
          conversationHistory: conversationHistory
      },
      // Habilitar el uso de las herramientas definidas en el prompt
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

    
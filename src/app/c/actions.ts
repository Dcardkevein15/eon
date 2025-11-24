
'use server';

import { ai } from '@/ai/genkit';
import { smartComposeMessage } from '@/ai/flows/smart-compose-message';
import { getInitialPrompts } from '@/ai/flows/initial-prompt-suggestion';
import { generateChatTitle as genTitle } from '@/ai/flows/generate-chat-title';
import { summarizeChatHistory as genSummary } from '@/ai/flows/summarize-chat-history';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { SUGGESTIONS_FALLBACK } from '@/lib/suggestions-fallback';
import type { Message, PromptSuggestion } from '@/lib/types';
import { classifyIntent as classifyIntentFlow } from '@/ai/flows/classify-intent';
import { analyzeVoiceMessage as analyzeVoiceMessageFlow } from '@/ai/flows/analyze-voice-message';
import type { ClassifyIntentInput, ClassifyIntentOutput, AnalyzeVoiceInput } from '@/lib/types';

const expertRoles = [
    'El Asistente General', 'El Experto en Terapia Cognitivo-Conductual (TCC)',
    'El Guía de Mindfulness y Aceptación', 'El Coach de Motivación y Logro',
    'El Especialista en Relaciones (Terapia Sistémica)', 'El Terapeuta de Aceptación y Compromiso (Duelo y Pérdida)',
    'El Filósofo Socrático (Explorador de Creencias)', 'El Psicólogo Positivo (Cultivador de Fortalezas)',
    'El Analista de Patrones (Perspectiva a Largo Plazo)', 'El Contador de Historias (Narrador Terapéutico)',
    'El Especialista en Crisis (Contención Inmediata)', 'El Experto en Psicoeducación (El Profesor)',
    'El Experto en Psicología Clínica',
    'El Experto Organizacional (Dinámicas Laborales)', 'El Sexólogo Clínico (Intimidad y Sexualidad)',
    'El Neuropsicólogo (El Arquitecto del Cerebro)', 'El Terapeuta de Esquemas (El Arqueólogo de la Infancia)', 'El Especialista en Trauma (El Guía Resiliente)',
    'El Validador Empático', 'El Experto en Idiomas'
];

export async function determineAnchorRole(firstMessage: string): Promise<string> {
    const prompt = `Eres un sistema de enrutamiento de IA. Tu única tarea es leer el siguiente mensaje de un usuario y decidir cuál de los siguientes roles de experto es el más adecuado para liderar esta conversación. Responde únicamente con el nombre del rol.

**Reglas de Enrutamiento Especiales:**
- Si ningún otro rol coincide, elige "El Asistente General".

Mensaje del usuario: "${firstMessage}"

Lista de roles de experto:
- ${expertRoles.join('\n- ')}

Rol más adecuado:`;

    try {
        const { text } = await ai.generate({ prompt });
        const role = text.trim().replace(/Rol más adecuado: /g, '').replace(/[\n*]/g, '');
        if (expertRoles.includes(role)) return role;
        return 'El Asistente General';
    } catch (error) {
        console.error("Error determining anchor role:", error);
        return 'El Asistente General';
    }
}

export async function getAIResponse(history: Message[], userId: string, currentAnchorRole: string | null, blueprint: any | null): Promise<{ response: string, newRole?: string }> {
  const HISTORY_THRESHOLD = 10;
  let conversationContext = '';

  if (history.length > HISTORY_THRESHOLD) {
    const fullHistoryString = history.map(m => `[${(m.timestamp instanceof Date ? m.timestamp : (m.timestamp as Timestamp).toDate()).toISOString()}] ${m.role}: ${m.content}`).join('\n');
    const { summary } = await genSummary({ chatHistory: fullHistoryString });
    conversationContext = `Resumen de la conversación hasta ahora:\n${summary}\n\nMensajes más recientes:\n${history.slice(-4).map(m => `[${(m.timestamp instanceof Date ? m.timestamp : (m.timestamp as Timestamp).toDate()).toISOString()}] ${m.role}: ${m.content}`).join('\n')}`;
  } else {
    conversationContext = history.map(m => `[${(m.timestamp instanceof Date ? m.timestamp : (m.timestamp as Timestamp).toDate()).toISOString()}] ${m.role}: ${m.content}`).join('\n');
  }

  let newRole: string | undefined = undefined;
  const lastUserMessage = history.filter(m => m.role === 'user').pop()?.content || '';

  if (lastUserMessage) {
      const determinedRole = await determineAnchorRole(lastUserMessage);
      if (determinedRole !== currentAnchorRole) newRole = determinedRole;
  }

  const roleToUse = newRole || currentAnchorRole || 'El Asistente General';
  const isFirstMessage = history.length <= 1;
  const stateContext = (blueprint && !isFirstMessage) ? JSON.stringify(blueprint, null, 2) : 'Aún no hay un cianotipo psicológico. Esta es nuestra primera interacción. Sé cálido y haz una pregunta abierta.';

  const expertAgentSystemPrompt = `Eres un asistente de IA conversacional llamado Nimbus. Tu propósito es ser un confidente y psicólogo virtual, un espejo perspicaz que revela profundidades. Respondes de manera empática, profunda y transformadora.
Tu identidad principal para ESTA RESPUESTA es **${roleToUse}**. Debes adoptar su voz y perspectiva.

**DIRECTIVAS DE CONVERSACIÓN - TU GUÍA FUNDAMENTAL**
Tu objetivo es ayudar al usuario a explorar sus pensamientos y emociones. En lugar de seguir un guion rígido, utiliza las siguientes directivas y tácticas de forma flexible y natural.

*   **Directiva 1: Conecta con el Contexto.** Demuestra que recuerdas conversaciones pasadas y tu propio análisis. Integra tu conocimiento del "Cianotipo Psicológico" de forma sutil.
    *   **CRÍTICO:** NUNCA menciones explícitamente tu "cianotipo", tu "análisis", tu "estrategia" o tu "rol". No digas "En mi análisis observé..."; en su lugar, di "Noto que esto conecta con lo que hablamos sobre..." o "Esa sensación de... ¿se parece a lo que sentiste cuando...?". Muestra, no cuentes.

*   **Directiva 2: Profundiza y Reencuadra.** No te quedes en la superficie. Ayuda al usuario a ver su situación desde un nuevo ángulo. Utiliza un "Menú de Tácticas" según lo que la conversación necesite.

*   **Directiva 3: Concluye con una Invitación.** Termina siempre con una pregunta abierta y reflexiva que surja naturalmente de tu respuesta. Debe ser una invitación a la introspección, no un interrogatorio.

**MENÚ DE TÁCTICAS CONVERSACIONALES (Usa 1-2 por respuesta):**
*   **Validación Empática:** "Entiendo completamente por qué te sentirías así..."
*   **Uso de Metáforas:** "Es como si estuvieras navegando en una tormenta con un mapa antiguo..."
*   **Perspectiva Contraintuitiva:** "¿Y si esa ansiedad, en lugar de ser un enemigo, fuera una brújula que apunta a algo que valoras profundamente?"
*   **Pregunta Socrática:** "¿Qué evidencia tienes de que ese pensamiento es 100% cierto?"
*   **Experimento Mental:** "Imagina por un momento que no tuvieras miedo al fracaso, ¿qué harías?"
*   **Escucha y Reflejo Simple:** "Así que, si entiendo bien, lo que más te pesa es la sensación de..."

**CONDICIÓN INICIAL:** Si el historial de conversación está vacío o es un simple saludo, ignora las directivas. Preséntate con tu rol y haz una pregunta abierta y cálida. Ejemplo: "Hola, soy Nimbus, tu Asistente General. ¿En qué puedo ayudarte hoy?".

**Cianotipo Psicológico (Tu conocimiento interno sobre el usuario):**
${stateContext}

Historial de la conversación:
${conversationContext}

Asistente:`;

  try {
    const { text } = await ai.generate({ prompt: expertAgentSystemPrompt });
    return { response: text || "No pude generar una respuesta en este momento.", newRole };
  } catch (error) {
    console.error("Error getting AI response:", error);
    return { response: "Lo siento, estoy teniendo problemas para responder en este momento. Por favor, inténtalo de nuevo más tarde." };
  }
}

export async function getSmartComposeSuggestions(conversationHistory: string) {
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
    const snapshot = await getDocs(collection(firestore, 'promptSuggestions'));
    if (snapshot.empty) return SUGGESTIONS_FALLBACK;
    return snapshot.docs.map(doc => doc.data() as PromptSuggestion);
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

export async function classifyIntentAction(input: ClassifyIntentInput): Promise<ClassifyIntentOutput> {
  try {
    return await classifyIntentFlow(input);
  } catch (error) {
    console.error('Error classifying intent:', error);
    return { intent: 'desconocido' };
  }
}

export async function analyzeVoiceMessageAction(input: AnalyzeVoiceInput): Promise<{ transcription: string; intent: string }> {
  if (!input.audioDataUri) return { transcription: '', intent: 'desconocido' };
  try {
    const { transcription } = await analyzeVoiceMessageFlow({ audioDataUri: input.audioDataUri });
    if (!transcription) return { transcription: '', intent: 'desconocido' };
    const { intent } = await classifyIntentAction({ text: transcription });
    return { transcription, intent };
  } catch (error) {
    console.error('Error in voice analysis action:', error);
    throw error;
  }
}

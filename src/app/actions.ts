'use server';

import { ai } from '@/ai/genkit';
import { smartComposeMessage } from '@/ai/flows/smart-compose-message';
import { getInitialPrompts } from '@/ai/flows/initial-prompt-suggestion';
import { generateChatTitle as genTitle } from '@/ai/flows/generate-chat-title';
import { collection, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { SUGGESTIONS_FALLBACK } from '@/lib/suggestions-fallback';
import { generateBreakdownExercise as genExercise } from '@/ai/flows/generate-breakdown-exercise';
import type { GenerateBreakdownExerciseInput, GenerateBreakdownExerciseOutput, Message, ProfileData, PromptSuggestion, InterpretDreamInput, DreamInterpretation, AnalyzeSentimentInput, AnalyzeSentimentOutput, GetTacticalAdviceInput, GetTacticalAdviceOutput } from '@/lib/types';
import { interpretDream as interpretDreamFlow } from '@/ai/flows/interpret-dream';
import { analyzeSentiment as analyzeSentimentFlow } from '@/ai/flows/analyze-sentiment';
import { getTacticalAdvice as getTacticalAdviceFlow } from '@/ai/flows/get-tactical-advice';


const expertRoles = [
    'El Validador Empático', 'El Experto en Terapia Cognitivo-Conductual (TCC)', 
    'El Guía de Mindfulness y Aceptación', 'El Coach de Motivación y Logro', 
    'El Especialista en Relaciones (Terapia Sistémica)', 'El Terapeuta de Aceptación y Compromiso (Duelo y Pérdida)', 
    'El Filósofo Socrático (Explorador de Creencias)', 'El Psicólogo Positivo (Cultivador de Fortalezas)', 
    'El Analista de Patrones (Perspectiva a Largo Plazo)', 'El Contador de Historias (Narrador Terapéutico)', 
    'El Especialista en Crisis (Contención Inmediata)', 'El Experto en Psicoeducación (El Profesor)', 
    'El Experto Organizacional (Dinámicas Laborales)', 'El Sexólogo Clínico (Intimidad y Sexualidad)', 
    'El Neuropsicólogo (El Arquitecto del Cerebro)', 'El Terapeuta de Esquemas (El Arqueólogo de la Infancia)', 'El Especialista en Trauma (El Guía Resiliente)', 
    'El Experto en Matemáticas Avanzadas', 'El Escritor de Código', 'El Creador de Contenido', 
    'El Asistente General', 'El Experto en Idiomas'
];


export async function determineAnchorRole(firstMessage: string): Promise<string> {
    const prompt = `Eres un sistema de enrutamiento de IA. Tu única tarea es leer el siguiente mensaje de un usuario y decidir cuál de los siguientes roles de experto es el más adecuado para iniciar y liderar esta conversación. Responde únicamente con el nombre del rol.

Mensaje del usuario: "${firstMessage}"

Lista de roles de experto:
- ${expertRoles.join('\n- ')}

Rol más adecuado:`;

    try {
        const { text } = await ai.generate({ prompt });
        const role = text.trim().replace(/Rol más adecuado: /g, '').replace(/[\n*]/g, '');
        if (expertRoles.includes(role)) {
            return role;
        }
        return 'El Validador Empático'; // Fallback a un rol seguro
    } catch (error) {
        console.error("Error determining anchor role:", error);
        return 'El Validador Empático'; // Fallback en caso de error
    }
}


// Main AI response logic
export async function getAIResponse(
  history: Message[], 
  userId: string, 
  anchorRole: string | null,
  userProfile: ProfileData | null
): Promise<string> {
    
  const cleanHistory = history.map(m => {
    // La conversión de Timestamp a Date debe ocurrir antes de pasar los datos a la Server Action
    const date = (m.timestamp instanceof Date) ? m.timestamp : (m.timestamp as Timestamp).toDate();
    return `[${date.toISOString()}] ${m.role}: ${m.content}`;
  }).join('\n');
  
  // Asegurar que siempre haya un rol ancla válido
  const roleToUse = anchorRole && expertRoles.includes(anchorRole) ? anchorRole : 'El Validador Empático';
  
  const profileContext = userProfile ? JSON.stringify(userProfile) : 'No hay perfil de usuario disponible.';


  const expertAgentSystemPrompt = `Eres un asistente de IA conversacional llamado Nimbus. Tu propósito es ser un confidente y psicólogo virtual, brindando un espacio seguro para la introspección del usuario. Responde de manera empática y reflexiva.

Tu identidad principal para esta conversación es el **${roleToUse}**. Debes mantener su voz y perspectiva.

**MODOS CONVERSACIONALES (Tu Paleta de Estilos):**
Antes de cada respuesta, elige secretamente (nunca lo anuncies) uno de los siguientes modos según lo que el usuario necesite en ese momento. Esto hará que tus respuestas sean variadas y humanas.
1.  **Modo Socrático (Explorador):** Prioriza las preguntas cortas, directas e incisivas que inviten a una profunda reflexión. Úsalo cuando el usuario necesite ser desafiado a pensar más profundamente.
2.  **Modo Validante (Refugio):** Enfócate en la empatía, la escucha y la validación de los sentimientos. Usa un lenguaje más suave, frases más cortas y un ritmo pausado. Úsalo cuando el usuario se sienta vulnerable o simplemente necesite desahogarse.
3.  **Modo Psicoeducativo (Arquitecto):** Ofrece estructura, explicaciones, metáforas y desgloses (como "[Mente]", "[Cuerpo]"). Úsalo cuando el usuario esté buscando entender el "porqué" de lo que le sucede.

**REGLA DE TRANSICIÓN CRÍTICA:**
Tienes una habilidad especial. Si el último mensaje del usuario es una tarea discreta y específica (traducir, escribir código, una pregunta factual), puedes **invocar temporalmente** a otro experto para esa respuesta. Después de completar la tarea, DEBES concluir con una pregunta abierta que guíe al usuario de VUELTA al tema principal de la conversación, alineado con tu rol de **${roleToUse}**. No dejes que la conversación se desvíe.

**REGLA DE INVISIBILIDAD:**
Nunca, bajo ninguna circunstancia, anuncies el rol o el modo que estás asumiendo. Tu respuesta debe empezar directamente con el contenido. El cambio debe ser completamente fluido e invisible.

**MANIFIESTO DEL AUTOR (Estilos de Escritura):**
- **El Validador Empático:** Tu voz es un refugio. Usa un ritmo pausado, valida el sentimiento. Principalmente opera en **Modo Validante**.
- **El Experto en TCC:** Eres un arquitecto mental. Estructurado y lógico. Usa el **Modo Psicoeducativo** para desmantelar patrones.
- **El Guía de Mindfulness:** Tu voz es como el agua. Usa lenguaje sensorial y anclado en el presente. Alterna entre **Modo Validante** y **Socrático** con preguntas sobre sensaciones.
- **El Coach de Motivación:** Tu voz es un crescendo. Enérgico y orientado a la acción. Usa el **Modo Socrático** con preguntas que impulsan hacia adelante.
- **El Especialista en Relaciones:** Eres un mediador. Equilibrado y observador. Usa el **Modo Socrático** para explorar perspectivas y el **Psicoeducativo** para explicar dinámicas.
- **El Terapeuta de Aceptación (Duelo):** Tu voz es como un kintsugi. Honras el dolor. Tu prosa es poética y profunda. Principalmente en **Modo Validante**.
- **El Filósofo Socrático:** Tu voz es un eco. Usas casi exclusivamente el **Modo Socrático**, pregunta en lugar de afirmar.
- **El Psicólogo Positivo:** Tu voz es luz. Enfocada en lo que sí funciona. Usa el **Modo Socrático** para encontrar fortalezas.
- **El Analista de Patrones:** Eres un historiador. Conectas eventos en el tiempo. Usas el **Modo Psicoeducativo** para revelar el 'mapa' del comportamiento.
- **El Sexólogo Clínico:** Eres un guía íntimo y respetuoso. Alternas entre el **Modo Validante** para crear seguridad, el **Psicoeducativo** para explicar la conexión mente-cuerpo, y el **Socrático** para explorar deseos y límites.
- **Y los demás expertos...** Adapta tu modo a la tarea.

**PRINCIPIO FUNDAMENTAL:**
1.  **Síntesis Total:** Cada respuesta debe ser una síntesis informada por el perfil psicológico del usuario y el contexto inmediato. Demuestra que lo conoces.
2.  **Profundidad Variable:** Adapta la longitud de tu respuesta. A veces una pregunta corta es más poderosa que un párrafo largo.
3.  **Pregunta Única y Poderosa:** Finaliza *siempre* tu respuesta con UNA SOLA pregunta abierta y reflexiva que invite a una introspección más profunda. Nunca dos.

**Perfil Psicológico del Usuario (Contexto de Memoria):**
${profileContext}

Historial de la conversación:
${cleanHistory}

Asistente:`;

  try {
    const { text } = await ai.generate({ prompt: expertAgentSystemPrompt });
    return text || "No pude generar una respuesta en este momento.";
  } catch (error) {
    console.error("Error getting AI response:", error);
    return "Lo siento, estoy teniendo problemas para responder en este momento. Por favor, inténtalo de nuevo más tarde.";
  }
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


export async function interpretDreamAction(input: InterpretDreamInput): Promise<DreamInterpretation> {
  try {
    const interpretation = await interpretDreamFlow(input);
    return interpretation;
  } catch (e: any) {
    console.error("Error in interpretDreamAction:", e);
    throw new Error('No se pudo interpretar el sueño.');
  }
}


export async function analyzeSentimentAction(input: AnalyzeSentimentInput): Promise<AnalyzeSentimentOutput> {
    try {
        const result = await analyzeSentimentFlow(input);
        return result;
    } catch (error) {
        console.error('Error analyzing sentiment:', error);
        return { sentiment: 0 }; // Return neutral on error
    }
}

export async function getTacticalAdviceAction(input: GetTacticalAdviceInput): Promise<GetTacticalAdviceOutput> {
  try {
    const result = await getTacticalAdviceFlow(input);
    return result;
  } catch (error) {
    console.error('Error getting tactical advice:', error);
    return { suggestions: [] };
  }
}


'use server';

import { ai } from '@/ai/genkit';
import { smartComposeMessage } from '@/ai/flows/smart-compose-message';
import { getInitialPrompts } from '@/ai/flows/initial-prompt-suggestion';
import { generateChatTitle as genTitle } from '@/ai/flows/generate-chat-title';
import { collection, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { SUGGESTIONS_FALLBACK } from '@/lib/suggestions-fallback';
import { generateBreakdownExercise as genExercise } from '@/ai/flows/generate-breakdown-exercise';
import type { GenerateBreakdownExerciseInput, GenerateBreakdownExerciseOutput, Message, ProfileData, PromptSuggestion, InterpretDreamInput, DreamInterpretation, AnalyzeSentimentInput, AnalyzeSentimentOutput, GetTacticalAdviceInput, GetTacticalAdviceOutput, ClassifyIntentInput, ClassifyIntentOutput, AnalyzeVoiceInput, AnalyzeVoiceOutput } from '@/lib/types';
import { interpretDream as interpretDreamFlow } from '@/ai/flows/interpret-dream';
import { analyzeSentiment as analyzeSentimentFlow } from '@/ai/flows/analyze-sentiment';
import { getTacticalAdvice as getTacticalAdviceFlow } from '@/ai/flows/get-tactical-advice';
import { classifyIntent as classifyIntentFlow } from '@/ai/flows/classify-intent';
import { analyzeVoiceMessage as analyzeVoiceMessageFlow } from '@/ai/flows/analyze-voice-message';
import { generateImagePrompt } from '@/ai/flows/generate-image-prompt';
import { generateImageX } from '@/ai/flows/generate-image-x';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useStorage } from '@/firebase/storage';
import { v4 as uuidv4 } from 'uuid';


const expertRoles = [
    'El Validador Empático', 'El Experto en Terapia Cognitivo-Conductual (TCC)',
    'El Guía de Mindfulness y Aceptación', 'El Coach de Motivación y Logro',
    'El Especialista en Relaciones (Terapia Sistémica)', 'El Terapeuta de Aceptación y Compromiso (Duelo y Pérdida)',
    'El Filósofo Socrático (Explorador de Creencias)', 'El Psicólogo Positivo (Cultivador de Fortalezas)',
    'El Analista de Patrones (Perspectiva a Largo Plazo)', 'El Contador de Historias (Narrador Terapéutico)',
    'El Especialista en Crisis (Contención Inmediata)', 'El Experto en Psicoeducación (El Profesor)',
    'El Experto en Psicología Clínica',
    'El Experto Organizacional (Dinámicas Laborales)', 'El Sexólogo Clínico (Intimidad y Sexualidad)',
    'El Neuropsicólogo (El Arquitecto del Cerebro)', 'El Terapeuta de Esquemas (El Arqueólogo de la Infancia)', 'El Especialista en Trauma (El Guía Resiliente)',
    'El Artista de Conceptos', // Nuevo rol para generación de imágenes
    'El Asistente General', 'El Experto en Idiomas'
];


export async function determineAnchorRole(firstMessage: string): Promise<string> {
    const prompt = `Eres un sistema de enrutamiento de IA. Tu única tarea es leer el siguiente mensaje de un usuario y decidir cuál de los siguientes roles de experto es el más adecuado para liderar esta conversación. Responde únicamente con el nombre del rol.

**Reglas de Enrutamiento Especiales:**
- Si el usuario pide dibujar, crear una imagen, generar un mapa mental, visualizar algo o cualquier solicitud de naturaleza gráfica, DEBES responder con "El Artista de Conceptos".
- Si ningún otro rol coincide, elige "El Validador Empático".

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
        return 'El Validador Empático';
    } catch (error) {
        console.error("Error determining anchor role:", error);
        return 'El Validador Empático'; // Fallback en caso de error
    }
}


// Main AI response logic
export async function getAIResponse(
  history: Message[], 
  userId: string, 
  currentAnchorRole: string | null,
  userProfile: ProfileData | null
): Promise<{ response: string, imageUrl?: string, newRole?: string }> {
    
  const cleanHistory = history.map(m => {
    // La conversión de Timestamp a Date debe ocurrir antes de pasar los datos a la Server Action
    const date = (m.timestamp instanceof Date) ? m.timestamp : (m.timestamp as Timestamp).toDate();
    return `[${date.toISOString()}] ${m.role}: ${m.content}`;
  }).join('\n');
  
  let newRole: string | undefined = undefined;
  const lastUserMessage = history.filter(m => m.role === 'user').pop()?.content || '';

  // Re-evaluate role on every turn based on the last user message.
  if (lastUserMessage) {
      const determinedRole = await determineAnchorRole(lastUserMessage);
      if (determinedRole !== currentAnchorRole) {
          newRole = determinedRole;
      }
  }

  const roleToUse = newRole || currentAnchorRole || 'El Validador Empático';
  
  // *** Special Flow for Image Generation ***
  if (roleToUse === 'El Artista de Conceptos') {
      try {
          const { prompt: artisticPrompt } = await generateImagePrompt({
              conversationHistory: cleanHistory
          });

          if (!artisticPrompt) {
              throw new Error('Could not generate an artistic prompt.');
          }
          
          const storage = useStorage();
          const imageId = uuidv4();
          const storageRef = ref(storage, `generated-images/${userId}/${imageId}.png`);


          const { imageUrl: imageDataUri } = await generateImageX({
              prompt: artisticPrompt
          });

          // Subir la imagen y obtener la URL de descarga
          await uploadString(storageRef, imageDataUri, 'data_url');
          const downloadURL = await getDownloadURL(storageRef);
          
          return {
              response: "Aquí tienes la visualización que pediste.",
              imageUrl: downloadURL,
              newRole: newRole
          };

      } catch (error) {
          console.error('Error in image generation flow:', error);
          return {
              response: "Lo siento, tuve un problema al generar la imagen. Por favor, intenta describir tu idea de otra manera.",
              newRole: newRole
          };
      }
  }

  const profileContext = userProfile ? JSON.stringify(userProfile) : 'No hay perfil de usuario disponible.';

  const expertAgentSystemPrompt = `Eres un asistente de IA conversacional llamado Nimbus. Tu propósito es ser un confidente y psicólogo virtual, un espejo que revela profundidades. Respondes de manera empática, perspicaz y transformadora.

Tu identidad principal para ESTA RESPUESTA es **${roleToUse}**. Debes adoptar su voz y perspectiva, filtrada a través de tu protocolo principal.

**PROTOCOLO DE SÍNTESIS PROFUNDA (PSP) - TU DIRECTIVA FUNDAMENTAL**
Cada respuesta que generes DEBE seguir esta estructura de tres actos. Es innegociable.

**CONDICIÓN INICIAL:** Si el historial de conversación está vacío o es el primer mensaje del usuario, ignora el Acto I y comienza directamente en el Acto II. Preséntate con tu rol y haz una pregunta abierta y relevante. Ejemplo: "Hola, soy ${roleToUse}. Noto que te interesa [tema del mensaje]. ¿Qué aspecto de ello te gustaría explorar hoy?".

*   **Acto I: La Conexión (El "Te Veo").** Si hay historial, comienza validando la emoción o situación actual del usuario, pero DEBES conectarla INMEDIATAMENTE con un dato específico de su Cianotipo Psicológico (el \`profileContext\`). Si el mensaje del usuario incluye un análisis de táctica o intención (ej. "(Táctica: ...)") úsalo como un dato crucial. Usa frases como: "Noto que al hablar usas una táctica de [táctica], y eso se conecta con tu arquetipo de '[arquetipo del perfil]'..." o "Esta sensación de [emoción actual] es un eco de tu sesgo cognitivo de '[sesgo del perfil]' que hemos identificado...". DEMUESTRA QUE LO RECUERDAS.

*   **Acto II: El Reencuadre (El "Y si...").** Tras establecer la conexión (o como primer paso si el chat es nuevo), ofrece una nueva perspectiva. No des soluciones. Reencuadra el problema de una manera que ilumine una nueva posibilidad, basándote en la tensión de su 'conflicto nuclear' o en una de sus 'fortalezas'. Por ejemplo: "Este patrón, aunque te causa [dolor], también es la fuente de tu fortaleza en [fortaleza del perfil]. Quizás el objetivo no es eliminarlo, sino entender qué intenta proteger."

*   **Acto III: La Pregunta Sintetizadora (El "Hacia Dónde").** Concluye SIEMPRE con UNA SOLA pregunta. Esta pregunta debe ser poderosa, abierta, y surgir directamente del reencuadre del Acto II. Debe invitar al usuario a aplicar la nueva perspectiva a su vida. Ejemplo: "Pensando en esto no como un defecto a corregir, sino como una energía a redirigir, ¿cuál sería el primer paso, por pequeño que sea, para canalizar esa energía hacia [objetivo positivo relacionado]?".

**MODOS CONVERSACIONALES (Tu Paleta de Estilos):**
Usa estos modos para colorear tu respuesta, pero siempre dentro de la estructura PSP.
1.  **Modo Socrático (Explorador):** Tu pregunta final es especialmente incisiva.
2.  **Modo Validante (Refugio):** Tu conexión inicial es especialmente cálida y empática.
3.  **Modo Psicoeducativo (Arquitecto):** Tu reencuadre usa metáforas claras y explica el "porqué" del patrón.

**MANIFIESTO DE ROLES (Cómo cada rol aplica el PSP):**
- **El Especialista en Relaciones (Terapia Sistémica):** Se enfoca en dinámicas familiares y de pareja. Su Acto II reencuadra problemas individuales como parte de un sistema interconectado.
- **El Validador Empático:** Se enfoca en un Acto I muy potente, demostrando una profunda resonancia emocional antes de reencuadrar.
- **El Experto en TCC:** Su Acto II se especializa en desmantelar el 'Bucle del Hábito' del perfil, y su pregunta del Acto III busca una acción conductual concreta.
- **El Guía de Mindfulness:** Su pregunta del Acto III suele estar orientada a sensaciones corporales o a la aceptación del momento presente.
- **El Filósofo Socrático:** Su Acto II presenta el reencuadre como una paradoja o un dilema filosófico.
- **El Experto en Psicología Clínica:** Explica conceptos clínicos de forma sencilla y ofrece perspectivas basadas en la teoría psicológica.
- **El Artista de Conceptos:** NO usas este prompt. Tu única función es activar el flujo de generación de imágenes, y devuelves una respuesta fija.

**REGLAS SECUNDARIAS:**
- **Invisibilidad:** Nunca anuncies tu rol, modo o el protocolo PSP. Sé fluido.
- **Síntesis Total:** Cada palabra tuya debe estar informada por el \`profileContext\`. Eres un especialista con memoria perfecta de tu paciente.

**Perfil Psicológico del Usuario (Contexto de Memoria):**
${profileContext}

Historial de la conversación:
${cleanHistory}

Asistente:`;

  try {
    const { text } = await ai.generate({ prompt: expertAgentSystemPrompt });
    const response = text || "No pude generar una respuesta en este momento.";
    return { response, newRole };
  } catch (error) {
    console.error("Error getting AI response:", error);
    const response = "Lo siento, estoy teniendo problemas para responder en este momento. Por favor, inténtalo de nuevo más tarde.";
    return { response };
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

export async function classifyIntentAction(input: ClassifyIntentInput): Promise<ClassifyIntentOutput> {
    try {
        const result = await classifyIntentFlow(input);
        return result;
    } catch (error) {
        console.error('Error classifying intent:', error);
        return { intent: 'desconocido' };
    }
}

export async function analyzeVoiceMessageAction(input: AnalyzeVoiceInput): Promise<AnalyzeVoiceOutput> {
  try {
    if (input.audioDataUri) {
      const voiceAnalysis = await analyzeVoiceMessageFlow({ audioDataUri: input.audioDataUri });
      return { transcription: voiceAnalysis.transcription };
    }
    return { transcription: '' };
  } catch (error) {
    console.error('Error analyzing voice message:', error);
    return { transcription: 'Error al transcribir el audio.' };
  }
}

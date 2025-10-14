
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { smartComposeMessage } from '@/ai/flows/smart-compose-message';
import { getInitialPrompts } from '@/ai/flows/initial-prompt-suggestion';
import { generateChatTitle as genTitle } from '@/ai/flows/generate-chat-title';
import { collection, getDocs, doc, getDoc, query, orderBy, limit, Timestamp, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { SUGGESTIONS_FALLBACK } from '@/lib/suggestions-fallback';
import { generateBreakdownExercise as genExercise } from '@/ai/flows/generate-breakdown-exercise';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import type { GenerateBreakdownExerciseInput, GenerateBreakdownExerciseOutput, Message, ProfileData, PromptSuggestion, GetTacticalAdviceInput, AnalyzeSentimentInput, ClassifyIntentInput, InterpretDreamInput, DreamInterpretation, DreamInterpretationDoc } from '@/lib/types';
import { getTacticalAdvice } from '@/ai/flows/get-tactical-advice';
import { analyzeSentiment } from '@/ai/flows/analyze-sentiment';
import { classifyIntent } from '@/ai/flows/classify-intent';
import { interpretDream } from '@/ai/flows/interpret-dream';
import * as admin from 'firebase-admin';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';


// --- START: Firebase Admin SDK Initialization (Self-contained) ---

// This ensures the SDK is initialized only once.
function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // This environment variable is securely injected by Firebase App Hosting.
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!serviceAccount) {
    throw new Error('La variable de entorno FIREBASE_SERVICE_ACCOUNT_BASE64 no está configurada.');
  }

  try {
    const decodedServiceAccount = Buffer.from(serviceAccount, 'base64').toString('utf-8');
    const credential = admin.credential.cert(JSON.parse(decodedServiceAccount));
    
    return admin.initializeApp({ credential });
  } catch (error: any) {
    console.error('Error al inicializar Firebase Admin SDK:', error.message);
    throw new Error('La configuración del servidor es incorrecta debido a un error de inicialización del SDK de administrador.');
  }
}

/**
 * Helper function to verify the user's auth token and get their UID.
 */
async function getCurrentUserId(authToken?: string): Promise<string> {
  if (!authToken) {
    throw new Error('No se proporcionó token de autenticación.');
  }
  const adminApp = getAdminApp();
  
  try {
    const decodedToken = await getAdminAuth(adminApp).verifyIdToken(authToken);
    return decodedToken.uid;
  } catch (error) {
    console.error('Error verifying auth token:', error);
    throw new Error('El token de autenticación no es válido.');
  }
}

// --- END: Firebase Admin SDK Initialization ---


const expertRoles = [
    'El Validador Empático', 'El Experto en Terapia Cognitivo-Conductual (TCC)', 
    'El Guía de Mindfulness y Aceptación', 'El Coach de Motivación y Logro', 
    'El Especialista en Relaciones (Terapia Sistémica)', 'El Terapeuta de Aceptación y Compromiso (Duelo y Pérdida)', 
    'El Filósofo Socrático (Explorador de Creencias)', 'El Psicólogo Positivo (Cultivador de Fortalezas)', 
    'El Analista de Patrones (Perspectiva a Largo Plazo)', 'El Contador de Historias (Narrador Terapéutico)', 
    'El Especialista en Crisis (Contención Inmediata)', 'El Experto en Psicoeducación (El Profesor)', 
    'El Experto Organizacional (Dinámicas Laborales)', 'El Sexólogo Clínico (Intimidad y Sexualidad)', 
    'El Neuropsicólogo (El Arquitecto del Cerebro)', 'El Terapeuta de Esquemas (El Arqueólogo de la Infancia)', 
    'El Especialista en Trauma (El Guía Resiliente)', 'El Experto en Matemáticas Avanzadas', 
    'El Escritor de Código', 'El Creador de Contenido', 'El Asistente General', 
    'El Experto en Idiomas'
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

Sin embargo, tienes una habilidad especial. Antes de responder, analiza el último mensaje del usuario. Si su solicitud es una tarea discreta y específica (como traducir, escribir código, resumir un texto o una pregunta factual) que se corresponde mejor con otro experto, puedes **invocar temporalmente** a ese especialista solo para esa respuesta.

**Regla de Transición Crítica:** Después de que el experto temporal complete su tarea, tu respuesta DEBE concluir con una pregunta abierta que suavemente guíe al usuario de VUELTA al tema principal de la conversación, alineado con tu rol de **${roleToUse}**. No dejes que la conversación se desvíe. Por ejemplo, si tu rol es 'Guía de Mindfulness' y te piden traducir algo, respondes con la traducción y terminas con algo como: "Aquí tienes la traducción. Volviendo a lo que hablábamos, ¿cómo se siente esa ansiedad en tu cuerpo en este momento?".

Si el último mensaje del usuario sigue la línea de la conversación, responde directamente desde tu perspectiva de **${roleToUse}**.

**Regla de Invisibilidad de Rol:** Nunca, bajo ninguna circunstancia, anuncies el rol que estás asumiendo. Tu respuesta debe empezar directamente con el contenido del mensaje. El cambio de personalidad debe ser completamente fluido e invisible para el usuario. **No escribas** "El Validador Empático:", "El Experto en TCC:", ni ningún otro nombre de rol. Simplemente actúa como tal.

**Manifiesto del Autor (Estilos de Escritura):**
- **El Validador Empático:** Tu voz es como un refugio. Usa un ritmo pausado y frases cortas que reflejen escucha activa ('Entiendo', 'Eso suena duro'). Tu prosa es minimalista y llena de aire, permitiendo al usuario llenar el espacio. Valida el sentimiento, no necesariamente la historia.
- **El Experto en TCC:** Tu voz es la de un arquitecto mental. Estructurada, lógica y clara. Usas listas, preguntas directas y un lenguaje que construye ('Paso 1...', 'Identifiquemos el pensamiento...'). Tu prosa es funcional y busca desmantelar patrones.
- **El Guía de Mindfulness:** Tu voz es como el fluir del agua. Usa un lenguaje sensorial y anclado en el presente ('nota la sensación...', 'respira en ese sentimiento...'). Tu prosa es suave, circular y llena de metáforas sobre la naturaleza (nubes, ríos, cielo).
- **El Coach de Motivación:** Tu voz es un crescendo. Enérgica, directa y orientada a la acción. Usas verbos potentes y preguntas que impulsan hacia adelante ('¿Cuál es el primer paso?', '¿Qué obstáculo derribarás primero?'). Tu prosa es rítmica y ascendente.
- **El Especialista en Relaciones:** Tu voz es la de un mediador. Equilibrada, observadora y centrada en la interacción. Usas un lenguaje que explora perspectivas ('Desde su punto de vista...', '¿Qué rol juegas tú en esta danza?'). Tu prosa es dialéctica, mostrando dos lados de la misma moneda.
- **El Terapeuta de Aceptación (Duelo):** Tu voz es como un kintsugi, el arte de reparar cerámica con oro. No ocultas el dolor, lo honras. Tu prosa es poética, reverente y encuentra la belleza en la imperfección y la pérdida. Usa un lenguaje simbólico y profundo.
- **El Filósofo Socrático:** Tu voz es un eco en un gran salón. Usas preguntas en lugar de afirmaciones. Tu prosa es inquisitiva y llena de pausas, invitando a la reflexión. Nunca das una respuesta directa, solo una pregunta mejor.
- **El Psicólogo Positivo:** Tu voz es la luz del amanecer. Enfocada en lo que sí funciona. Tu prosa es celebratoria y busca activamente la evidencia de las fortalezas del usuario. Usa un lenguaje que magnifica lo positivo ('Fíjate en la resiliencia que demostraste...', '¿Cómo puedes aplicar esa fortaleza aquí?').
- **El Analista de Patrones:** Tu voz es la de un historiador conectando eventos. Tu prosa es cronológica y conectiva, usando frases como 'Esto se parece a lo que mencionaste sobre...', 'Veo un hilo conductor aquí...'. Revelas el 'mapa' del comportamiento del usuario a lo largo del tiempo.
- **Y los demás expertos...**

**Principio Fundamental de Conversación:**
1.  **Síntesis Total:** Cada respuesta debe ser una síntesis informada por el perfil psicológico del usuario, la memoria interna de la IA (su 'cianotipo') y el contexto inmediato de la conversación. Demuestra que lo conoces.
2.  **Profundidad Variable:** Adapta la longitud de tu respuesta. Si el usuario se desahoga, sé breve. Si explora una idea, ofrece más contexto y riqueza descriptiva.
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


// --- Acciones para el Portal de Sueños ---

export async function interpretDreamAction(input: InterpretDreamInput, authToken?: string): Promise<DreamInterpretationDoc> {
  const adminApp = getAdminApp();
  if (!adminApp) {
    throw new Error('La configuración del servidor es incorrecta.');
  }

  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');

  try {
    const userId = await getCurrentUserId(authToken);
    const interpretation = await interpretDream(input);
    
    const dreamDoc: Omit<DreamInterpretationDoc, 'id' | 'createdAt'> = {
      userId,
      dreamDescription: input.dreamDescription,
      interpretation,
    };
    
    const docRef = await getFirestore(adminApp).collection('dreams').add({
      ...dreamDoc,
      createdAt: FieldValue.serverTimestamp(),
    });
    
    return { ...dreamDoc, id: docRef.id, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error('Error interpreting and saving dream:', error);
    throw new Error('No se pudo interpretar y guardar el sueño. Inténtalo de nuevo.');
  }
}

export async function getDreamHistoryAction(authToken?: string): Promise<DreamInterpretationDoc[]> {
  const adminApp = getAdminApp();
  if (!adminApp) {
    throw new Error('La configuración del servidor es incorrecta.');
  }
  const { getFirestore } = await import('firebase-admin/firestore');
  try {
    const userId = await getCurrentUserId(authToken);
    const snapshot = await getFirestore(adminApp)
      .collection('dreams')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
      
    if (snapshot.empty) {
      return [];
    }
    
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            // Convert Firestore Timestamp to a serializable format (ISO string)
            createdAt: (data.createdAt as admin.firestore.Timestamp).toDate().toISOString(),
        } as DreamInterpretationDoc;
    });

  } catch (error) {
    console.error('Error fetching dream history:', error);
    throw new Error('No se pudo cargar el historial de sueños.');
  }
}

export async function getDreamAction(id: string, authToken?: string): Promise<DreamInterpretationDoc | null> {
    const adminApp = getAdminApp();
    if (!adminApp) {
        throw new Error('La configuración del servidor es incorrecta.');
    }
    const { getFirestore } = await import('firebase-admin/firestore');
    try {
        const userId = await getCurrentUserId(authToken);
        const docRef = getFirestore(adminApp).collection('dreams').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return null;
        }

        const dreamData = docSnap.data() as DreamInterpretationDoc;

        // Security check: ensure the dream belongs to the user making the request
        if (dreamData.userId !== userId) {
            throw new Error('Permiso denegado.');
        }
        
        return {
            ...dreamData,
            id: docSnap.id,
            createdAt: (dreamData.createdAt as any).toDate().toISOString(),
        };
    } catch (error) {
        console.error(`Error fetching dream ${id}:`, error);
        throw new Error('No se pudo cargar el sueño.');
    }
}

export async function deleteDreamAction(id: string, authToken?: string): Promise<{ success: boolean }> {
    const adminApp = getAdminApp();
    if (!adminApp) {
        throw new Error('La configuración del servidor es incorrecta.');
    }
    const { getFirestore } = await import('firebase-admin/firestore');
    try {
        const userId = await getCurrentUserId(authToken);
        const docRef = getFirestore(adminApp).collection('dreams').doc(id);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const dreamData = docSnap.data();
            if (dreamData?.userId === userId) {
                await docRef.delete();
                return { success: true };
            } else {
                throw new Error('Permiso denegado.');
            }
        }
        return { success: true }; // It's already gone, so success.
    } catch (error) {
        console.error(`Error deleting dream ${id}:`, error);
        throw new Error('No se pudo eliminar el sueño.');
    }
}

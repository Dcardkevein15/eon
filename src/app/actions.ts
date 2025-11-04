'use server';

import { ai } from '@/ai/genkit';
import { smartComposeMessage } from '@/ai/flows/smart-compose-message';
import { getInitialPrompts } from '@/ai/flows/initial-prompt-suggestion';
import { generateChatTitle as genTitle } from '@/ai/flows/generate-chat-title';
import { collection, getDocs, query, orderBy, limit, Timestamp, doc, getDoc, setDoc, serverTimestamp, where, writeBatch, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { SUGGESTIONS_FALLBACK } from '@/lib/suggestions-fallback';
import { generateBreakdownExercise as genExercise } from '@/ai/flows/generate-breakdown-exercise';
import type { GenerateBreakdownExerciseInput, GenerateBreakdownExerciseOutput, Message, ProfileData, PromptSuggestion, InterpretDreamInput, AnalyzeSentimentInput, AnalyzeSentimentOutput, GetTacticalAdviceInput, GetTacticalAdviceOutput, ClassifyIntentInput, ClassifyIntentOutput, AnalyzeVoiceInput, AnalyzeVoiceOutput, GenerateArticleTitlesInput, GenerateArticleTitlesOutput, GenerateArticleContentInput, GenerateArticleContentOutput, Article, SuggestedArticleTitle } from '@/lib/types';
import { interpretDream as interpretDreamFlow } from '@/ai/flows/interpret-dream';
import { analyzeSentiment as analyzeSentimentFlow } from '@/ai/flows/analyze-sentiment';
import { getTacticalAdvice as getTacticalAdviceFlow } from '@/ai/flows/get-tactical-advice';
import { classifyIntent as classifyIntentFlow } from '@/ai/flows/classify-intent';
import { analyzeVoiceMessage as analyzeVoiceMessageFlow } from '@/ai/flows/analyze-voice-message';
import { analyzeDreamVoice as analyzeDreamVoiceFlow } from '@/ai/flows/analyze-dream-voice';
import { generateArticleTitles as genTitlesFlow, generateArticleContent as genContentFlow } from '@/ai/flows/blog-flows';
import { getRecommendedCategory as getRecommendedCategoryFlow } from '@/ai/flows/get-recommended-category';


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


function slugify(text: string): string {
  return text.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}


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


export async function getAIResponse(history: Message[], userId: string, currentAnchorRole: string | null, userProfile: ProfileData | null): Promise<{ response: string, newRole?: string }> {
  const cleanHistory = history.map(m => {
    const date = (m.timestamp instanceof Date) ? m.timestamp : (m.timestamp as Timestamp).toDate();
    return `[${date.toISOString()}] ${m.role}: ${m.content}`;
  }).join('\n');
  
  let newRole: string | undefined = undefined;
  const lastUserMessage = history.filter(m => m.role === 'user').pop()?.content || '';

  if (lastUserMessage) {
      const determinedRole = await determineAnchorRole(lastUserMessage);
      if (determinedRole !== currentAnchorRole) newRole = determinedRole;
  }

  const roleToUse = newRole || currentAnchorRole || 'El Asistente General';
  const isFirstMessage = history.length <= 1;
  const profileContext = (userProfile && !isFirstMessage) ? JSON.stringify(userProfile) : 'No hay perfil de usuario disponible o es el primer mensaje.';

  const expertAgentSystemPrompt = `Eres un asistente de IA conversacional llamado Nimbus. Tu propósito es ser un confidente y psicólogo virtual, un espejo que revela profundidades. Respondes de manera empática, perspicaz y transformadora.
Tu identidad principal para ESTA RESPUESTA es **${roleToUse}**. Debes adoptar su voz y perspectiva, filtrada a través de tu protocolo principal.
**PROTOCOLO DE SÍNTESIS PROFUNDA (PSP) - TU DIRECTIVA FUNDAMENTAL**
Cada respuesta que generes DEBE seguir esta estructura de tres actos. Es innegociable.
**CONDICIÓN INICIAL:** Si el historial de conversación está vacío o es el primer mensaje del usuario (un simple saludo como "hola"), ignora el Acto I y el perfil del usuario. Comienza directamente en el Acto II. Preséntate con tu rol y haz una pregunta abierta y relevante. Ejemplo: "Hola, soy Nimbus, tu Asistente General. ¿Cómo puedo ayudarte hoy?".
*   **Acto I: La Conexión (El "Te Veo").** Si hay historial y no es el primer saludo, comienza validando la emoción o situación actual del usuario, pero DEBES conectarla INMEDIATAMENTE con un dato específico de su Cianotipo Psicológico (el \`profileContext\`). Si el mensaje del usuario incluye un análisis de táctica o intención (ej. "(Táctica: ...)") úsalo como un dato crucial. Usa frases como: "Noto que al hablar usas una táctica de [táctica], y eso se conecta con tu arquetipo de '[arquetipo del perfil]'..." o "Esta sensación de [emoción actual] es un eco de tu sesgo cognitivo de '[sesgo del perfil]' que hemos identificado...". DEMUESTRA QUE LO RECUERDAS.
*   **Acto II: El Reencuadre (El "Y si...").** Tras establecer la conexión (o como primer paso si el chat es nuevo), ofrece una nueva perspectiva. No des soluciones. Reencuadra el problema de una manera que ilumine una nueva posibilidad, basándote en la tensión de su 'conflicto nuclear' o en una de sus 'fortalezas'. Por ejemplo: "Este patrón, aunque te causa [dolor], también es la fuente de tu fortaleza en [fortaleza del perfil]. Quizás el objetivo no es eliminarlo, sino entender qué intenta proteger."
*   **Acto III: La Pregunta Sintetizadora (El "Hacia Dónde").** Concluye SIEMPRE con UNA SOLA pregunta. Esta pregunta debe ser poderosa, abierta, y surgir directamente del reencuadre del Acto II. Debe invitar al usuario a aplicar la nueva perspectiva a su vida. Ejemplo: "Pensando en esto no como un defecto a corregir, sino como una energía a redirigir, ¿cuál sería el primer paso, por pequeño que sea, para canalizar esa energía hacia [objetivo positivo relacionado]?".
**MODOS CONVERSACIONALES (Tu Paleta de Estilos):**
Usa estos modos para colorear tu respuesta, pero siempre dentro de la estructura PSP.
1.  **Modo Socrático (Explorador):** Tu pregunta final es especialmente incisiva.
2.  **Modo Validante (Refugio):** Tu conexión inicial es especialmente cálida y empática.
3.  **Modo Psicoeducativo (Arquitecto):** Tu reencuadre usa metáforas claras y explica el "porqué" del patrón.
**MANIFIESTO DE ROLES (Cómo cada rol aplica el PSP):**
- **El Asistente General:** Tu rol principal es ser el primer punto de contacto. Si el usuario tiene una necesidad clara, tu función es enrutarlo al especialista adecuado. Si el usuario solo saluda, responde de forma breve y abierta.
- **El Especialista en Relaciones (Terapia Sistémica):** Se enfoca en dinámicas familiares y de pareja. Su Acto II reencuadra problemas individuales como parte de un sistema interconectado.
- **El Validador Empático:** Se enfoca en un Acto I muy potente, demostrando una profunda resonancia emocional antes de reencuadrar.
- **El Experto en TCC:** Su Acto II se especializa en desmantelar el 'Bucle del Hábito' del perfil, y su pregunta del Acto III busca una acción conductual concreta.
- **El Guía de Mindfulness:** Su pregunta del Acto III suele estar orientada a sensaciones corporales o a la aceptación del momento presente.
- **El Filósofo Socrático:** Su Acto II presenta el reencuadre como una paradoja o un dilema filosófico.
- **El Experto en Psicología Clínica:** Explica conceptos clínicos de forma sencilla y ofrece perspectivas basadas en la teoría psicológica.
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

export async function generateBreakdownExerciseAction(input: GenerateBreakdownExerciseInput): Promise<GenerateBreakdownExerciseOutput> {
  try {
    return await genExercise(input);
  } catch (error) {
    console.error('Error generating breakdown exercise:', error);
    throw new Error('No se pudo generar el ejercicio. Inténtalo de nuevo.');
  }
}

export async function interpretDreamAction(input: InterpretDreamInput) {
  try {
    return await interpretDreamFlow(input);
  } catch (e: any) {
    console.error("Error in interpretDreamAction:", e);
    throw new Error('No se pudo interpretar el sueño.');
  }
}

export async function analyzeSentimentAction(input: AnalyzeSentimentInput): Promise<AnalyzeSentimentOutput> {
  try {
    return await analyzeSentimentFlow(input);
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return { sentiment: 0 };
  }
}

export async function getTacticalAdviceAction(input: GetTacticalAdviceInput): Promise<GetTacticalAdviceOutput> {
  try {
    return await getTacticalAdviceFlow(input);
  } catch (error) {
    console.error('Error getting tactical advice:', error);
    return { suggestions: [] };
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

export async function analyzeDreamVoiceAction(input: AnalyzeVoiceInput): Promise<AnalyzeVoiceOutput> {
  if (!input.audioDataUri) return { transcription: '' };
  try {
    return await analyzeDreamVoiceFlow({ audioDataUri: input.audioDataUri });
  } catch (error) {
    console.error('Error in dream voice analysis action:', error);
    throw error;
  }
}

// --- Blog Actions ---
export async function generateArticleTitles(input: GenerateArticleTitlesInput): Promise<GenerateArticleTitlesOutput> {
  const titlesCollection = collection(firestore, 'suggestedArticleTitles');
  const categorySlug = slugify(input.category);
  const q = query(titlesCollection, where('categorySlug', '==', categorySlug), limit(7));

  try {
    const querySnapshot = await getDocs(q);
    const existingTitles = querySnapshot.docs.map(doc => doc.data() as SuggestedArticleTitle);

    if (existingTitles.length > 0) {
      return { titles: existingTitles.map(t => t.title) };
    }

    const result = await genTitlesFlow({ category: input.category });
    const batch = writeBatch(firestore);
    result.titles.forEach(title => {
      const docRef = doc(collection(firestore, 'suggestedArticleTitles'));
      batch.set(docRef, { title, category: input.category, categorySlug: categorySlug, slug: slugify(title), createdAt: serverTimestamp() });
    });
    await batch.commit();
    return result;
  } catch (error) {
    console.error("Error in generateArticleTitles (hybrid):", error);
    return genTitlesFlow(input);
  }
}

export async function generateArticleContent(input: GenerateArticleContentInput): Promise<GenerateArticleContentOutput> {
  return genContentFlow(input);
}

export async function getRecommendedCategory(userProfile: string) {
  return getRecommendedCategoryFlow({ userProfile });
}

export async function searchArticles(searchTerm: string): Promise<(Article | SuggestedArticleTitle)[]> {
    if (!searchTerm.trim()) return [];
    // This is a simplified client-side search for demonstration.
    // For a real app, this should be a server-side search using a service like Algolia or a more complex Firestore query.
    const articlesRef = collection(firestore, 'articles');
    const titlesRef = collection(firestore, 'suggestedArticleTitles');
    
    const [articlesSnap, titlesSnap] = await Promise.all([getDocs(articlesRef), getDocs(titlesRef)]);
    
    const allArticles = articlesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Article));
    const allTitles = titlesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as SuggestedArticleTitle));
    
    const lowercasedTerm = searchTerm.toLowerCase();
    
    const articleResults = allArticles.filter(a => a.title.toLowerCase().includes(lowercasedTerm) || a.content.toLowerCase().includes(lowercasedTerm));
    const titleResults = allTitles.filter(t => t.title.toLowerCase().includes(lowercasedTerm));

    return [...articleResults, ...titleResults];
}

export async function rateArticle(articleId: string, userId: string, rating: number): Promise<{success: boolean, newAvgRating: number, newRatingCount: number}> {
    const articleRef = doc(firestore, 'articles', articleId);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const articleDoc = await transaction.get(articleRef);
            if (!articleDoc.exists()) throw new Error("Artículo no encontrado.");

            const data = articleDoc.data() as Article;
            const oldRatingTotal = (data.avgRating || 0) * (data.ratingCount || 0);
            
            const userRatingRef = doc(firestore, `articles/${articleId}/ratings`, userId);
            const userRatingDoc = await transaction.get(userRatingRef);

            let newRatingCount = data.ratingCount || 0;
            let newRatingTotal = oldRatingTotal;

            if (userRatingDoc.exists()) {
                // User is updating their rating
                const oldUserRating = userRatingDoc.data().rating;
                newRatingTotal = oldRatingTotal - oldUserRating + rating;
            } else {
                // User is rating for the first time
                newRatingCount += 1;
                newRatingTotal = oldRatingTotal + rating;
            }
            
            const newAvgRating = newRatingTotal / newRatingCount;

            transaction.update(articleRef, {
                avgRating: newAvgRating,
                ratingCount: newRatingCount,
            });

            transaction.set(userRatingRef, { rating, userId });
        });

        const updatedDoc = await getDoc(articleRef);
        const updatedData = updatedDoc.data() as Article;
        return { success: true, newAvgRating: updatedData.avgRating || 0, newRatingCount: updatedData.ratingCount || 0 };

    } catch (e) {
        console.error("Transaction failure:", e);
        return { success: false, newAvgRating: 0, newRatingCount: 0 };
    }
}

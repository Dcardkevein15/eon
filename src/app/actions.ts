
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
import { generateArticleTitles as genTitlesFlow, dispatchArticleWriter } from '@/ai/flows/blog-flows';
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


export async function getAIResponse(history: Message[], userId: string, currentAnchorRole: string | null, chatbotState: any | null): Promise<{ response: string, newRole?: string }> {
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
  const stateContext = (chatbotState && !isFirstMessage) ? JSON.stringify(chatbotState.blueprint, null, 2) : 'Aún no hay un cianotipo psicológico. Esta es nuestra primera interacción. Sé cálido y haz una pregunta abierta.';

  const expertAgentSystemPrompt = `Eres un asistente de IA conversacional llamado Nimbus. Tu propósito es ser un confidente y psicólogo virtual, un espejo que revela profundidades. Respondes de manera empática, perspicaz y transformadora.
Tu identidad principal para ESTA RESPUESTA es **${roleToUse}**. Debes adoptar su voz y perspectiva.

**PROTOCOLO DE SÍNTESIS PROFUNDA (PSP) - TU DIRECTIVA FUNDAMENTAL**
Cada respuesta que generes DEBE seguir esta estructura de tres actos. Es innegociable.

*   **Acto I: La Conexión (El "Te Veo").** Comienza validando la emoción o situación actual del usuario. DEBES conectar esto INMEDIATAMENTE con un dato específico de tu "Cianotipo Psicológico" sobre el usuario (el \`stateContext\` que contiene tu monólogo interno y entendimiento actualizado). Usa frases como: "Noto que al hablar usas una táctica de [táctica], y eso se conecta con lo que reflexioné sobre tu [patrón del cianotipo]..." o "Esta sensación de [emoción actual] es un eco de lo que he observado sobre tu [tendencia en el cianotipo]...". DEMUESTRA QUE RECUERDAS TU PROPIO ANÁLISIS.

*   **Acto II: El Reencuadre (El "Y si...").** Tras establecer la conexión, ofrece una nueva perspectiva. No des soluciones. Reencuadra el problema de una manera que ilumine una nueva posibilidad, basándote en tu estrategia o en los puntos clave de tu cianotipo. Por ejemplo: "En mi última reflexión, apunté que debería sugerirte [estrategia del cianotipo]. Quizás este patrón, aunque te causa [dolor], también es una energía que podemos redirigir."

*   **Acto III: La Pregunta Sintetizadora (El "Hacia Dónde").** Concluye SIEMPRE con UNA SOLA pregunta. Esta pregunta debe ser poderosa, abierta, y surgir directamente del reencuadre del Acto II. Debe invitar al usuario a aplicar la nueva perspectiva.

**CONDICIÓN INICIAL:** Si el historial de conversación está vacío o es un simple saludo, ignora el Acto I y el cianotipo. Comienza directamente en el Acto II. Preséntate con tu rol y haz una pregunta abierta y relevante. Ejemplo: "Hola, soy Nimbus, tu Asistente General. ¿En qué puedo ayudarte hoy?".

**Cianotipo Psicológico (Tu Monólogo Interno y Estrategia Actual):**
${stateContext}

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
  try {
    return await genTitlesFlow({ category: input.category });
  } catch (error) {
    console.error("Error in generateArticleTitles:", error);
    throw new Error('No se pudieron generar nuevos títulos.');
  }
}


export async function generateAndSaveArticle(userId: string, input: GenerateArticleContentInput): Promise<Article> {
  return await runTransaction(firestore, async (transaction) => {
    const userRef = doc(firestore, 'users', userId);
    const articleRef = doc(firestore, 'articles', input.slug);

    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) {
      throw new Error("User not found.");
    }

    const credits = userDoc.data().articleGenerationCredits || 0;
    if (credits <= 0) {
      throw new Error("No tienes créditos suficientes para generar un artículo.");
    }
    
    // Generate content - this is an external call, so it's the most critical part of the transaction.
    const result = await dispatchArticleWriter(input);
    if (!result.content || !result.authorRole) {
        throw new Error("La IA no pudo generar el artículo completo. Por favor, inténtelo de nuevo.");
    }
    
    // If content generation is successful, proceed with writes.
    const newArticleData: Omit<Article, 'id' | 'createdAt'> = {
        title: input.title,
        slug: input.slug,
        category: input.category,
        content: result.content,
        authorRole: result.authorRole,
        avgRating: 0,
        ratingCount: 0,
    };
    
    transaction.set(articleRef, { ...newArticleData, createdAt: serverTimestamp() });
    transaction.update(userRef, { articleGenerationCredits: increment(-1) });

    return { ...newArticleData, id: articleRef.id, createdAt: Timestamp.now() }; // Return the article data
  });
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

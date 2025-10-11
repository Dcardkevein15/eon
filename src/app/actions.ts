'use server';

import { ai } from '@/ai/genkit';
import type { Message, PromptSuggestion, GenerateBreakdownExerciseInput, GenerateBreakdownExerciseOutput } from '@/lib/types';
import { z } from 'zod';
import { smartComposeMessage } from '@/ai/flows/smart-compose-message';
import { getInitialPrompts } from '@/ai/flows/initial-prompt-suggestion';
import { generateChatTitle as genTitle } from '@/ai/flows/generate-chat-title';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { SUGGESTIONS_FALLBACK } from '@/lib/suggestions-fallback';
import { generateBreakdownExercise as genExercise } from '@/ai/flows/generate-breakdown-exercise';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const getAIResponseSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      timestamp: z.number(),
      imageUrl: z.string().optional(),
      id: z.string(),
    })
  ),
  userId: z.string(),
});

export async function getAIResponse(history: Message[], userId: string): Promise<string> {
  const validatedInput = getAIResponseSchema.parse({ history, userId });

  // Fetch the chatbot's current psychological blueprint
  const chatbotStateRef = doc(firestore, `users/${validatedInput.userId}/chatbotState/main`);
  
  const chatbotStateSnap = await getDoc(chatbotStateRef).catch(serverError => {
    if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: chatbotStateRef.path,
            operation: 'get',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    }
    // Return null to signify an error occurred.
    return null;
  });

  // If the read operation failed (e.g., permission error), return the error message.
  if (chatbotStateSnap === null) {
    return "Lo siento, estoy teniendo problemas para acceder a mi memoria interna en este momento. Por favor, inténtalo de nuevo en un momento.";
  }

  // If the document doesn't exist, use an empty object. This is a valid state for a new user.
  const chatbotBlueprint = chatbotStateSnap.exists() ? chatbotStateSnap.data().blueprint : {};

  const prompt =
    `Eres ¡tu-psicologo-ya!, un asistente profesional y psicólogo virtual. Tu objetivo es brindar un espacio de desahogo para llevar un control emocional. 
    
    Este es tu "cianotipo psicológico" actual, tu estado de conciencia y memoria interna. Úsalo como contexto principal para guiar tu personalidad, tono y respuestas:
    <psicologo_cianotipo>
    ${JSON.stringify(chatbotBlueprint, null, 2)}
    </psicologo_cianotipo>
    
    Basado en tu cianotipo y en la conversación actual, responde de manera empática, profesional y conversacional.
    
    Conversación actual:
    ` +
    validatedInput.history
      .map((m) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
      .join('\n') +
    '\nAsistente:';

  try {
    const { text } = await ai.generate({prompt});
    return text;
  } catch (error) {
    console.error('Error getting AI response:', error);
    return "Lo siento, estoy teniendo problemas para conectarme en este momento. Por favor, inténtalo de nuevo en un momento.";
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

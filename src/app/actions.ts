'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { smartComposeMessage } from '@/ai/flows/smart-compose-message';
import { getInitialPrompts } from '@/ai/flows/initial-prompt-suggestion';
import { generateChatTitle as genTitle } from '@/ai/flows/generate-chat-title';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { SUGGESTIONS_FALLBACK } from '@/lib/suggestions-fallback';
import { generateBreakdownExerciseAction as genExercise } from './actions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import type { GenerateBreakdownExerciseInput, GenerateBreakdownExerciseOutput, Message, PromptSuggestion } from '@/lib/types';


const getAIResponseSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
  userId: z.string(),
});

export async function getAIResponse(history: Pick<Message, 'role' | 'content'>[], userId: string): Promise<string> {
  const validatedInput = getAIResponseSchema.parse({ history, userId });

  const chatbotStateRef = doc(firestore, `users/${validatedInput.userId}/chatbotState/main`);
  
  let chatbotBlueprint = {};

  try {
    const chatbotStateSnap = await getDoc(chatbotStateRef);
    if (chatbotStateSnap.exists()) {
      chatbotBlueprint = chatbotStateSnap.data().blueprint || {};
    }
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: chatbotStateRef.path,
            operation: 'get',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    }
    // Log other errors but proceed with an empty blueprint
    console.error("Could not fetch chatbot blueprint, proceeding without it.", serverError);
  }


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

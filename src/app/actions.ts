'use server';

import { ai } from '@/ai/genkit';
import type { Message, PromptSuggestion } from '@/lib/types';
import { z } from 'zod';
import { smartComposeMessage } from '@/ai/flows/smart-compose-message';
import { getInitialPrompts } from '@/ai/flows/initial-prompt-suggestion';
import { generateChatTitle as genTitle } from '@/ai/flows/generate-chat-title';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { SUGGESTIONS_FALLBACK } from '@/lib/suggestions-fallback';
import type { Part } from 'genkit';


const getAIResponseSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      imageUrl: z.string().optional(),
      // The timestamp is already serialized by Next.js into a plain object
      timestamp: z.object({
        seconds: z.number(),
        nanoseconds: z.number(),
      }),
      id: z.string(), // Keep the ID
    })
  ),
});

export async function getAIResponse(history: Message[]): Promise<string> {
  const validatedHistory = getAIResponseSchema.parse({ history });

  const systemPrompt = 'Eres ¡tu-psicologo-ya!, un asistente profesional y psicólogo virtual. Tu objetivo es brindar un espacio de desahogo para llevar un control emocional. Basado en la conversación, puedes realizar diagnósticos psicológicos y, si es apropiado, recomendar contactar a un psicólogo profesional. Responde siempre de manera empática, profesional y conversacional. Si el usuario envía una imagen, descríbela y analiza su contenido emocional si es relevante.';
  
  const messages: Part[] = validatedHistory.history.map(msg => {
    const content: Part[] = [];
    if (msg.content) {
      content.push({ text: msg.content });
    }
    if (msg.imageUrl) {
      content.push({ media: { url: msg.imageUrl } });
    }
    return { role: msg.role === 'user' ? 'user' : 'model', content };
  });

  try {
    const { text } = await ai.generate({ 
      system: systemPrompt,
      history: messages,
    });
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

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
      timestamp: z.number(), // The client sends a plain number (milliseconds)
      id: z.string(),
    })
  ),
});

export async function getAIResponse(history: Message[]): Promise<string> {
  // 1. Validate the incoming data structure from the client.
  const validatedHistory = getAIResponseSchema.parse({ history });

  // 2. Define the system prompt.
  const systemPrompt = 'Eres ¡tu-psicologo-ya!, un asistente profesional y psicólogo virtual. Tu objetivo es brindar un espacio de desahogo para llevar un control emocional. Basado en la conversación, puedes realizar diagnósticos psicológicos y, si es apropiado, recomendar contactar a un psicólogo profesional. Responde siempre de manera empática, profesional y conversacional. Si el usuario envía una imagen, descríbela y analiza su contenido emocional si es relevante.';
  
  // 3. Construct the message history in the format Genkit expects (`Part[]`).
  const messages: Part[] = [
    // The very first message must be the system prompt.
    { role: 'system', content: [{ text: systemPrompt }] },
    
    // Map the rest of the conversation history.
    ...validatedHistory.history.map(msg => {
      const content: Part[] = [];
      
      // Add text content if it exists.
      if (msg.content) {
        content.push({ text: msg.content });
      }

      // Add image content if it exists.
      if (msg.imageUrl) {
        // Genkit expects the image in a `media` object.
        content.push({ media: { url: msg.imageUrl } });
      }
      
      return { 
        // Convert 'assistant' role to 'model' for Genkit.
        role: msg.role === 'user' ? 'user' : 'model', 
        content 
      };
    })
  ];

  // 4. Call the AI with the correctly formatted history.
  try {
    const { text } = await ai.generate({ 
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

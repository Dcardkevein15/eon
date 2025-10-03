'use server';

import { ai } from '@/ai/genkit';
import type { Message } from '@/lib/types';
import { z } from 'zod';
import { smartComposeMessage } from '@/ai/flows/smart-compose-message';
import { getInitialPrompts } from '@/ai/flows/initial-prompt-suggestion';

const getAIResponseSchema = z.object({
  history: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      timestamp: z.number(),
    })
  ),
});

export async function getAIResponse(history: Message[]): Promise<string> {
  const validatedHistory = getAIResponseSchema.parse({ history });

  const prompt =
    'Eres un asistente de IA útil y amigable llamado Nimbus. Responde al usuario de manera conversacional.\n\n' +
    validatedHistory.history
      .map((m: Message) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
      .join('\n') +
    '\nAsistente:';

  try {
    const { text } = await ai.generate({prompt});
    return text;
  } catch (error) {
    console.error('Error getting AI response:', error);
    return "Lo siento, estoy teniendo problemas para conectarme a mi cerebro en este momento. Por favor, inténtalo de nuevo en un momento.";
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

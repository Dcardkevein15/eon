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
    'You are a helpful and friendly AI assistant named Nimbus. Respond to the user in a conversational manner.\n\n' +
    validatedHistory.history
      .map((m: Message) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n') +
    '\nAssistant:';

  try {
    const { text } = await ai.model.generate(prompt);
    return text();
  } catch (error) {
    console.error('Error getting AI response:', error);
    return "Sorry, I'm having trouble connecting to my brain right now. Please try again in a moment.";
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

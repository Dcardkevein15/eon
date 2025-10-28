'use server';
/**
 * @fileOverview Orchestrates a voice-to-voice chat session.
 *
 * This file is NOT meant to be used directly by the client.
 * Instead, the `useVisionSession` hook calls the `getAIResponse` function,
 * which in turn uses the flows defined here.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';
import { analyzeVoiceMessageAction } from '@/app/actions';
import { generateSpeech } from '@/ai/flows/speech';
import type { Message, ProfileData } from '@/lib/types';


/**
 * Generates a conversational text response based on the user's transcription.
 */
const conversationalResponseFlow = ai.defineFlow(
  {
    name: 'conversationalResponseFlow',
    inputSchema: z.string(), // User's transcribed text
    outputSchema: z.string(), // AI's text response
  },
  async (transcription) => {
    // This flow now correctly uses the globally configured model
    const { text } = await ai.generate({
      prompt: `You are a helpful and conversational AI assistant. The user said: "${transcription}". Respond in a natural and concise way.`,
    });
    return text;
  }
);


/**
 * Main orchestrator for the voice chat.
 * Takes the full conversation history and returns the AI's text response and audio URL.
 */
export async function getAIResponse(
  history: Message[],
  userId: string,
  currentAnchorRole: string | null,
  userProfile: ProfileData | null
): Promise<{ response: string; audioUrl: string }> {
  
  const lastUserMessage = history.filter(m => m.role === 'user').pop()?.content || '';

  if (!lastUserMessage.trim()) {
    return { response: '', audioUrl: '' };
  }

  // 1. Generate text response
  const textResponse = await conversationalResponseFlow(lastUserMessage);

  // 2. Convert text response to speech
  const { media: audioUrl } = await generateSpeech(textResponse);

  return { response: textResponse, audioUrl };
}

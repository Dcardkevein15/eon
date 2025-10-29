'use server';
/**
 * @fileOverview Orchestrates a multi-modal voice and vision chat session.
 *
 * This file is NOT meant to be used directly by the client.
 * Instead, the `useVisionSession` hook calls the `getAIResponse` function,
 * which in turn uses the flows defined here.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';
import { generateSpeech } from '@/ai/flows/speech';

// --- Schemas ---

const OrchestratorInputSchema = z.object({
  audioDataUri: z.string().describe("The user's voice message as a data URI."),
  imageDataUri: z.string().describe("A snapshot from the user's camera as a data URI."),
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ).describe("The history of the conversation so far."),
});
export type OrchestratorInput = z.infer<typeof OrchestratorInputSchema>;

const OrchestratorOutputSchema = z.object({
  transcription: z.string().describe("The transcription of the user's audio."),
  textResponse: z.string().describe("The AI's generated text response."),
  audioResponseUrl: z.string().describe("A data URI for the AI's spoken response."),
});
export type OrchestratorOutput = z.infer<typeof OrchestratorOutputSchema>;

// --- Main Orchestrator Flow ---

const voiceVisionOrchestratorFlow = ai.defineFlow(
  {
    name: 'voiceVisionOrchestratorFlow',
    inputSchema: OrchestratorInputSchema,
    outputSchema: OrchestratorOutputSchema,
  },
  async ({ audioDataUri, imageDataUri, conversationHistory }) => {

    // Step 1: Transcribe the user's audio
    const { text: transcription } = await ai.generate({
      model: googleAI.model('gemini-pro-vision'),
      prompt: [
        { text: "Tu única tarea es transcribir con la mayor precisión posible las palabras habladas en el siguiente mensaje de audio. La transcripción DEBE estar en el idioma original del audio." },
        { media: { url: audioDataUri } }
      ],
    });

    if (!transcription || transcription.trim().length === 0) {
      return { transcription: '', textResponse: '', audioResponseUrl: '' };
    }

    const userMessage = { role: 'user' as const, content: transcription };
    const newHistory = [...conversationHistory, userMessage];
    const historyForPrompt = newHistory.map(m => `${m.role}: ${m.content}`).join('\n');

    // Step 2: Generate a text response considering both transcription and image
    const { text: textResponse } = await ai.generate({
        model: googleAI.model('gemini-pro-vision'),
        prompt: [
            { text: `Eres un asistente de IA conversacional y empático llamado Nimbus. Estás en una videollamada. Responde de forma natural y concisa a la transcripción del usuario, PERO también considera la imagen proporcionada para reaccionar a su lenguaje no verbal (expresión facial, entorno). Haz que la conversación se sienta personal y cara a cara.

Historial de la conversación:
${historyForPrompt}

Ahora, responde al último mensaje del usuario.` },
            { media: { url: imageDataUri, contentType: 'image/jpeg' } },
        ],
    });

    if (!textResponse) {
      throw new Error("AI failed to generate a text response.");
    }

    // Step 3: Convert the text response to speech
    const { media: audioResponseUrl } = await generateSpeech(textResponse);

    // Step 4: Return all results
    return {
      transcription,
      textResponse,
      audioResponseUrl,
    };
  }
);


// --- Exported Function for Client ---

/**
 * Main exported function for the client-side hook to call.
 * It takes all necessary data, invokes the orchestrator flow, and returns the results.
 */
export async function getVisionAIResponse(input: OrchestratorInput): Promise<OrchestratorOutput> {
  return await voiceVisionOrchestratorFlow(input);
}

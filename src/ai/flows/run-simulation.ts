'use server';

/**
 * @fileOverview Runs a role-playing simulation for the Emotional Gym.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input schema for the simulation flow
const RunSimulationInputSchema = z.object({
  personaPrompt: z.string().describe('The system prompt that defines the AI persona for the simulation.'),
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ).describe('The history of the simulation conversation so far.'),
});
export type RunSimulationInput = z.infer<typeof RunSimulationInputSchema>;

// The main exported function that components will call.
export async function runSimulation(input: RunSimulationInput): Promise<string> {
  // Construct the full prompt including the persona and history
  const prompt = `${input.personaPrompt}

La conversación hasta ahora es la siguiente:
${input.conversationHistory.map(m => `${m.role === 'user' ? 'Usuario' : 'Personaje'}: ${m.content}`).join('\n')}

Personaje:`;

  const { text } = await ai.generate({ prompt });
  return text;
}

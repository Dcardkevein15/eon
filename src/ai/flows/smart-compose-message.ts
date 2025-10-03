'use server';

/**
 * @fileOverview Provides message suggestions based on the current conversation.
 *
 * - smartComposeMessage - A function that suggests possible next messages.
 * - SmartComposeMessageInput - The input type for the smartComposeMessage function.
 * - SmartComposeMessageOutput - The return type for the smartComposeMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartComposeMessageInputSchema = z.object({
  conversationHistory: z
    .string()
    .describe("The history of the conversation so far."),
});
export type SmartComposeMessageInput = z.infer<typeof SmartComposeMessageInputSchema>;

const SmartComposeMessageOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('Suggested next messages.'),
});
export type SmartComposeMessageOutput = z.infer<typeof SmartComposeMessageOutputSchema>;

export async function smartComposeMessage(
  input: SmartComposeMessageInput
): Promise<SmartComposeMessageOutput> {
  return smartComposeMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartComposeMessagePrompt',
  input: {schema: SmartComposeMessageInputSchema},
  output: {schema: SmartComposeMessageOutputSchema},
  prompt: `Given the following conversation history, suggest three possible next messages the user might want to send. Return the suggestions as a JSON array of strings.

Conversation History:
{{conversationHistory}}`,
});

const smartComposeMessageFlow = ai.defineFlow(
  {
    name: 'smartComposeMessageFlow',
    inputSchema: SmartComposeMessageInputSchema,
    outputSchema: SmartComposeMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

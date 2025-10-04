'use server';

/**
 * @fileOverview Generates a short, descriptive title for a chat based on its initial messages.
 *
 * - generateChatTitle - A function that creates a title.
 * - GenerateChatTitleInput - The input type for the generateChatTitle function.
 * - GenerateChatTitleOutput - The return type for the generateChatTitle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateChatTitleInputSchema = z.object({
  conversationHistory: z
    .string()
    .describe('The first user message and the first assistant response.'),
});
export type GenerateChatTitleInput = z.infer<
  typeof GenerateChatTitleInputSchema
>;

const GenerateChatTitleOutputSchema = z.object({
  title: z
    .string()
    .describe('A short, descriptive title for the chat (2-5 words).'),
});
export type GenerateChatTitleOutput = z.infer<
  typeof GenerateChatTitleOutputSchema
>;

export async function generateChatTitle(
  input: GenerateChatTitleInput
): Promise<GenerateChatTitleOutput> {
  return generateChatTitleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateChatTitlePrompt',
  input: {schema: GenerateChatTitleInputSchema},
  output: {schema: GenerateChatTitleOutputSchema},
  prompt: `Based on the following conversation excerpt, create a short, descriptive title of 2 to 5 words. The title should capture the main topic of the conversation.

Conversation:
{{{conversationHistory}}}

Example:
Conversation:
User: I've been feeling really stressed out at work lately.
Assistant: I'm sorry to hear that. Can you tell me more about what's been causing the stress?

Title:
{
  "title": "Stress at Work"
}
`,
});

const generateChatTitleFlow = ai.defineFlow(
  {
    name: 'generateChatTitleFlow',
    inputSchema: GenerateChatTitleInputSchema,
    outputSchema: GenerateChatTitleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

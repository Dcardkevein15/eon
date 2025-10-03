'use server';

/**
 * @fileOverview A flow that suggests initial prompts to new users.
 *
 * - getInitialPrompts - A function that returns a list of suggested prompts.
 * - InitialPromptsOutput - The return type for the getInitialPrompts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InitialPromptsOutputSchema = z.object({
  prompts: z.array(z.string()).describe('A list of suggested prompts to get the user started.'),
});

export type InitialPromptsOutput = z.infer<typeof InitialPromptsOutputSchema>;

export async function getInitialPrompts(): Promise<InitialPromptsOutput> {
  return initialPromptSuggestionFlow();
}

const initialPromptSuggestionFlow = ai.defineFlow(
  {
    name: 'initialPromptSuggestionFlow',
    outputSchema: InitialPromptsOutputSchema,
  },
  async () => {
    const {output} = await initialPromptSuggestionPrompt();
    return output!;
  }
);

const initialPromptSuggestionPrompt = ai.definePrompt({
  name: 'initialPromptSuggestionPrompt',
  output: {schema: InitialPromptsOutputSchema},
  prompt: `You are a helpful AI assistant. Generate a list of diverse and engaging prompts that new users can use to explore the capabilities of this AI chat application.

Focus on suggesting prompts that showcase a range of features and use cases, such as creative writing, problem-solving, information retrieval, and general conversation. The prompts should be clear, concise, and easy to understand.

Return the prompts as a JSON array of strings.

Example:
{
  "prompts": [
    "Write a short poem about the ocean.",
    "Summarize the plot of Hamlet.",
    "What are the benefits of meditation?",
    "Tell me a joke.",
    "Compose a haiku about autumn leaves",
    "Explain the theory of relativity in simple terms",
    "Give me five different ideas for healthy breakfasts",
    "Write a fictional story about a time traveler",
    "Translate 'Hello, how are you?' into Spanish",
    "List the chemical elements of the periodic table"
  ]
}

Ensure the array has at least 5 suggestions.
`,
});

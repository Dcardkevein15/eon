'use server';

/**
 * @fileOverview A flow that generates a comprehensive psychological profile for a user
 * based on their entire chat history.
 *
 * - generateUserProfile - A function that creates the profile.
 * - GenerateUserProfileInput - The input type for the function.
 * - GenerateUserProfileOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateUserProfileInputSchema = z.object({
  fullChatHistory: z
    .string()
    .describe(
      'The complete and unified history of all chat conversations for a single user.'
    ),
});
export type GenerateUserProfileInput = z.infer<
  typeof GenerateUserProfileInputSchema
>;

const GenerateUserProfileOutputSchema = z.object({
  diagnosis: z
    .string()
    .describe(
      'A descriptive diagnosis of the most likely psychological state based on the analysis of all conversations. It should be written in a professional, empathetic, and clear manner.'
    ),
  personality: z
    .string()
    .describe(
      'A detailed characterization of the personality, including dominant traits, cognitive style, frequent emotions, and patterns of thought and behavior.'
    ),
  recommendations: z
    .array(z.string())
    .describe(
      'A list of personalized recommendations for the psychological well-being and personal development of the user.'
    ),
});
export type GenerateUserProfileOutput = z.infer<
  typeof GenerateUserProfileOutputSchema
>;

export async function generateUserProfile(
  input: GenerateUserProfileInput
): Promise<GenerateUserProfileOutput> {
  return generateUserProfileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateUserProfilePrompt',
  input: { schema: GenerateUserProfileInputSchema },
  output: { schema: GenerateUserProfileOutputSchema },
  prompt: `You are an expert clinical psychologist AI. Your task is to analyze the complete chat history of a user to create an integrated and deep psychological profile. You must synthesize information across all provided conversations to build a continuous understanding of the person.

Based on the full chat history provided below, generate a comprehensive report with the following three sections:
1.  **Descriptive Diagnosis**: Identify the most likely psychological state. Describe it professionally, avoiding definitive labels but explaining the observed emotional and cognitive trends (e.g., "The user shows persistent patterns of anxious thinking," not "The user has anxiety disorder").
2.  **Personality Characterization**: Detail the user's personality. Mention dominant traits (e.g., introversion, conscientiousness), cognitive style (e.g., analytical, ruminative), frequent emotions (e.g., sadness, frustration), and recurring thought and behavior patterns.
3.  **Personalized Recommendations**: Provide a list of actionable, personalized recommendations for psychological well-being. These should be directly linked to the findings in the diagnosis and personality sections.

Maintain a professional, empathetic, and clinical tone throughout.

Full Chat History:
{{{fullChatHistory}}}
`,
});

const generateUserProfileFlow = ai.defineFlow(
  {
    name: 'generateUserProfileFlow',
    inputSchema: GenerateUserProfileInputSchema,
    outputSchema: GenerateUserProfileOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: "AIzaSyDzPL70mB-pb7SHXY-5RjrlCrvysRwYc5g",
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});

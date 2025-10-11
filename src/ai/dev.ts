'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-chat-history.ts';
import '@/ai/flows/initial-prompt-suggestion.ts';
import '@/ai/flows/smart-compose-message.ts';
import '@/ai/flows/generate-chat-title.ts';
import '@/ai/flows/generate-user-profile.ts';
import '@/ai/flows/generate-breakdown-exercise.ts';
import '@/ai/flows/update-psychological-blueprint.ts';

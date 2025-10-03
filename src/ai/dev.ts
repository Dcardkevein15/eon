import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-chat-history.ts';
import '@/ai/flows/initial-prompt-suggestion.ts';
import '@/ai/flows/smart-compose-message.ts';
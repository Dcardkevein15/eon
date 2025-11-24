
'use server';

import type { InterpretDreamInput, AnalyzeVoiceInput, AnalyzeVoiceOutput } from '@/lib/types';
import { interpretDream as interpretDreamFlow } from '@/ai/flows/interpret-dream';
import { analyzeDreamVoice as analyzeDreamVoiceFlow } from '@/ai/flows/analyze-dream-voice';


export async function interpretDreamAction(input: InterpretDreamInput) {
  try {
    return await interpretDreamFlow(input);
  } catch (e: any) {
    console.error("Error in interpretDreamAction:", e);
    throw new Error('No se pudo interpretar el sueño.');
  }
}

export async function analyzeDreamVoiceAction(input: AnalyzeVoiceInput): Promise<AnalyzeVoiceOutput> {
  if (!input.audioDataUri) return { transcription: '' };
  try {
    return await analyzeDreamVoiceFlow({ audioDataUri: input.audioDataUri });
  } catch (error) {
    console.error('Error in dream voice analysis action:', error);
    throw error;
  }
}

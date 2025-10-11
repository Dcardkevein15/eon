import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';
import { z } from 'zod';


export type User = FirebaseUser;

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
  imageUrl?: string;
};

export type Chat = {
  id:string;
  title: string;
  createdAt: Timestamp;
  userId: string;
  path: string;
};

export type PromptSuggestion = {
  text: string;
  category: string;
}

export type Therapist = {
  id: string;
  name: string;
  photoUrl: string;
  rating: number;
  reviewsCount: number;
  specialties: string[];
  pricePerSession: number;
  languages: string[];
  verified: boolean;
  credentials: string;
  bio: string;
};

// Schema and Type for Breakdown Exercise
export const HabitLoopSchema = z.object({
  trigger: z.string().describe('El disparador o situación recurrente que activa el patrón de comportamiento problemático.'),
  thought: z.string().describe('El pensamiento automático (sesgo cognitivo) que aparece inmediatamente después del disparador.'),
  action: z.string().describe('La acción o respuesta conductual (mecanismo de defensa) que se ejecuta como resultado del pensamiento.'),
  result: z.string().describe('La consecuencia a corto y largo plazo de este bucle, explicando cómo refuerza el problema.'),
});

export const GenerateBreakdownExerciseInputSchema = z.object({
  habitLoop: HabitLoopSchema,
});
export type GenerateBreakdownExerciseInput = z.infer<typeof GenerateBreakdownExerciseInputSchema>;

export const GenerateBreakdownExerciseOutputSchema = z.object({
  title: z.string().describe('Un título inspirador y relevante para el ejercicio.'),
  introduction: z.string().describe('Un párrafo introductorio corto, empático y que explica el propósito del ejercicio en formato Markdown.'),
  exerciseSteps: z.string().describe('Una guía paso a paso con 3-5 prompts de journaling o ejercicios de reflexión. Debe estar en formato Markdown, usando listas numeradas.'),
  finalThought: z.string().describe('Un párrafo final de ánimo y refuerzo positivo en formato Markdown.'),
});
export type GenerateBreakdownExerciseOutput = z.infer<typeof GenerateBreakdownExerciseOutputSchema>;

export type BreakdownExercise = z.infer<typeof GenerateBreakdownExerciseOutputSchema>;
export type HabitLoopData = z.infer<typeof HabitLoopSchema>;

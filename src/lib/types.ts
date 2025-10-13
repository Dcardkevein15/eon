import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';
import { z } from 'zod';


export type User = FirebaseUser;

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp | Date;
  imageUrl?: string;
};

export type Chat = {
  id:string;
  title: string;
  createdAt: Timestamp;
  userId: string;
  path: string;
  latestMessageAt?: Timestamp;
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


// Types for Psychological Profile
type EmotionalStatePoint = {
  date: string;
  sentiment: number;
  summary: string;
  keyEvents: string[];
};

type EmotionalConstellationData = {
  nodes: { id: string; val: number }[];
  links: { source: string; target: string; sentiment: number }[];
};

type CoreArchetypeData = {
  title: string;
  description:string;
  strengths: string;
  challenges: string;
};

export type ProfileData = {
  diagnosis: string;
  personality: string;
  recommendations: string[];
  strengths: string;
  cognitiveBiases: string[];
  defenseMechanisms: string[];
  emotionalJourney: EmotionalStatePoint[];
  emotionalConstellation: EmotionalConstellationData;
  coreArchetype?: CoreArchetypeData;
  coreConflict?: string;
  habitLoop?: HabitLoopData;
};

export type CachedProfile = {
  profile: ProfileData;
  lastMessageTimestamp: number; // Store as epoch time for easy comparison
};


// Types for Emotional Gym
export type SimulationScenario = {
  id: string;
  title: string;
  description: string;
  category: string;
  personaPrompt: string;
};

export type SimulationSession = {
  id: string;
  userId: string;
  scenarioId: string;
  scenarioTitle: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  feedback?: string;
  path: string;
};

// Schemas for new real-time trainer AI flows

// Tactical Advisor
export const GetTacticalAdviceInputSchema = z.object({
  scenarioTitle: z.string(),
  conversationHistory: z.string(),
});
export type GetTacticalAdviceInput = z.infer<typeof GetTacticalAdviceInputSchema>;

export const GetTacticalAdviceOutputSchema = z.object({
  suggestions: z.array(z.string()).length(3),
});
export type GetTacticalAdviceOutput = z.infer<typeof GetTacticalAdviceOutputSchema>;

// Sentiment Analysis
export const AnalyzeSentimentInputSchema = z.object({
  text: z.string(),
});
export type AnalyzeSentimentInput = z.infer<typeof AnalyzeSentimentInputSchema>;

export const AnalyzeSentimentOutputSchema = z.object({
  sentimentScore: z.number().min(-1).max(1),
});
export type AnalyzeSentimentOutput = z.infer<typeof AnalyzeSentimentOutputSchema>;

// Intent Classification
export const ClassifyIntentInputSchema = z.object({
  text: z.string(),
});
export type ClassifyIntentInput = z.infer<typeof ClassifyIntentInputSchema>;

export const ClassifyIntentOutputSchema = z.object({
  intent: z.string(),
});
export type ClassifyIntentOutput = z.infer<typeof ClassifyIntentOutputSchema>;

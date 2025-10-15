
import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';


export type User = import('firebase/auth').User;

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
  anchorRole?: string;
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


// --- Dream Portal Types ---
export const DreamInterpretationInputSchema = z.object({
    dreamDescription: z.string().describe('La descripción detallada del sueño contada por el usuario.'),
    userProfile: z.string().describe('El perfil psicológico completo del usuario en formato JSON. Proporciona el contexto para una interpretación personalizada.'),
});
export type InterpretDreamInput = z.infer<typeof DreamInterpretationInputSchema>;


export const SymbolAnalysisSchema = z.object({
    symbol: z.string().describe('El elemento simbólico clave identificado en el sueño (ej. "un bosque oscuro", "una llave dorada").'),
    universalMeaning: z.string().describe('El significado arquetípico o junguiano universal de este símbolo.'),
    personalMeaning: z.string().describe('La interpretación personalizada del símbolo, conectándolo directamente con los conflictos, arquetipos o patrones del perfil psicológico del usuario.'),
    icon: z.string().describe('Un solo emoji que represente visualmente el símbolo.')
});

export const DreamInterpretationContentSchema = z.object({
    dreamTitle: z.string().describe('Un título poético y evocador para el sueño, de 4 a 6 palabras.'),
    dominantFeeling: z.string().describe('La emoción principal o atmósfera que prevalece en el sueño (ej. "Ansiedad y confusión", "Liberación y alegría").'),
    coreArchetype: z.string().describe('El arquetipo junguiano principal que parece estar activo en este sueño (ej. "La Sombra", "El Héroe", "El Trickster").'),
    symbolAnalysis: z.array(SymbolAnalysisSchema).describe('Un análisis de 3 a 5 de los símbolos más importantes del sueño.'),
    narrativeInterpretation: z.string().describe('Una interpretación de la "trama" del sueño, explicándola como una metáfora de un conflicto, deseo o proceso psicológico que el usuario está viviendo, basándose en su perfil.'),
    reflectiveQuestion: z.string().describe('Una pregunta final, poderosa y abierta, diseñada para que el usuario reflexione sobre la conexión entre el sueño y su vida.'),
});


export type DreamInterpretation = z.infer<typeof DreamInterpretationContentSchema>;
export type SymbolAnalysis = z.infer<typeof SymbolAnalysisSchema>;

// This type is now for local storage, not Firestore.
export type DreamInterpretationDoc = {
    id: string;
    userId: string; // Keep for potential future sync, or for multi-user local session
    dreamDescription: string;
    interpretation: DreamInterpretation;
    createdAt: string; // ISO string for easy JSON serialization
};


// Sentiment Analysis types
export const AnalyzeSentimentInputSchema = z.object({
  text: z.string(),
});
export type AnalyzeSentimentInput = z.infer<typeof AnalyzeSentimentInputSchema>;

export const AnalyzeSentimentOutputSchema = z.object({
  sentiment: z.number().min(-1).max(1),
});
export type AnalyzeSentimentOutput = z.infer<typeof AnalyzeSentimentOutputSchema>;


// Tactical Advice types
export const GetTacticalAdviceInputSchema = z.object({
  scenarioTitle: z.string(),
  personaPrompt: z.string(),
  conversationHistory: z.string(),
});
export type GetTacticalAdviceInput = z.infer<typeof GetTacticalAdviceInputSchema>;

export const GetTacticalAdviceOutputSchema = z.object({
  suggestions: z.array(z.string()),
});
export type GetTacticalAdviceOutput = z.infer<typeof GetTacticalAdviceOutputSchema>;

// Classify Intent types
export const ClassifyIntentInputSchema = z.object({
  text: z.string(),
});
export type ClassifyIntentInput = z.infer<typeof ClassifyIntentInputSchema>;

export const ClassifyIntentOutputSchema = z.object({
  intent: z.string(),
});
export type ClassifyIntentOutput = z.infer<typeof ClassifyIntentOutputSchema>;

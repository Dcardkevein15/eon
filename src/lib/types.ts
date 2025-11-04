import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';


export type User = import('firebase/auth').User & {
  roles?: string[];
  therapistId?: string;
  articleGenerationCredits?: number;
  lastCreditRefresh?: Timestamp;
  favoriteArticles?: { [slug: string]: string }; // Map slug to ISO timestamp
  readArticles?: { [slug: string]: boolean };
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp | Date;
  anchorRole?: string;
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
  userId: string;
  name: string;
  photoUrl: string;
  email: string;
  whatsapp: string;
  rating: number;
  reviewsCount: number;
  specialties: string[];
  pricePerSession: number;
  languages: string[];
  verified: boolean;
  published: boolean;
  credentials: string;
  bio: string;
};

// --- Therapist Application ---
export const TherapistApplicationDataSchema = z.object({
  name: z.string().min(3, "El nombre es requerido."),
  email: z.string().email("Debe ser un correo electrónico válido."),
  whatsapp: z.string().min(10, "El número de WhatsApp es requerido."),
  credentials: z.string().min(10, "Las credenciales son requeridas."),
  bio: z.string().min(50, "La biografía debe tener al menos 50 caracteres."),
  specialties: z.union([z.string(), z.array(z.string())]).refine(val => (typeof val === 'string' && val.length > 0) || (Array.isArray(val) && val.length > 0), {
    message: "Ingresa al menos una especialidad.",
  }),
  languages: z.union([z.string(), z.array(z.string())]).refine(val => (typeof val === 'string' && val.length > 0) || (Array.isArray(val) && val.length > 0), {
    message: "Ingresa al menos un idioma.",
  }),
  pricePerSession: z.coerce.number().min(0, "El precio no puede ser negativo."),
});
export type TherapistApplicationData = z.infer<typeof TherapistApplicationDataSchema>;

export type TherapistApplication = {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Timestamp;
  applicationData: {
    name: string;
    email: string;
    whatsapp: string;
    credentials: string;
    bio: string;
    specialties: string[];
    languages: string[];
    pricePerSession: number;
    identityDocumentUrl: string;
    professionalLicenseUrl: string;
    photoUrl?: string;
  };
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
  expiresAt: Timestamp;
  completedAt?: Timestamp;
  feedback?: string;
  path: string;
};


// --- Dream Portal Types ---
export const DreamInterpretationInputSchema = z.object({
    dreamDescription: z.string().describe('La descripción detallada del sueño contada por el usuario.'),
    userProfile: z.string().describe('El perfil psicológico completo del usuario en formato JSON. Proporciona el contexto para una interpretación personalizada.'),
    perspective: z.string().describe('La perspectiva o "especialista" elegido para interpretar el sueño (ej: "psychological", "symbolic", "spiritual", "shamanic").'),
});
export type InterpretDreamInput = z.infer<typeof DreamInterpretationInputSchema>;

export type DreamInterpretationDoc = {
    id: string;
    userId: string;
    dreamDescription: string;
    interpretation: {
      interpretationText: string;
      dreamTitle?: string;
    };
    createdAt: string; // ISO string for easy JSON serialization
};

export type DreamSpecialist = {
  name: string;
  title: string;
  description: string;
  perspective: 'psychological' | 'symbolic' | 'spiritual' | 'shamanic';
  icon: React.ComponentType<{ className?: string }>;
};

export type DreamAudioDraft = {
  audioDataUri: string;
  timestamp: string;
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

// --- Trading Analysis Types ---
export const CoinSchema = z.object({
    id: z.string(),
    symbol: z.string(),
    name: z.string(),
});
export type Coin = z.infer<typeof CoinSchema>;

export const MarketDataItemSchema = z.object({
  timestamp: z.number(),
  value: z.number(),
});
export type MarketDataItem = z.infer<typeof MarketDataItemSchema>;

export const MarketDataSchema = z.object({
    prices: z.array(z.array(z.number())),
    total_volumes: z.array(z.array(z.number())),
}).nullable();
export type MarketData = z.infer<typeof MarketDataSchema>;

export const CryptoAnalysisInputSchema = z.object({
  crypto_id: z.string().describe("El ID de la criptomoneda según CoinGecko (ej: 'bitcoin', 'ethereum')."),
});
export type CryptoAnalysisInput = z.infer<typeof CryptoAnalysisInputSchema>;

export const CryptoDebateTurnSchema = z.object({
    analyst: z.enum(['Apex', 'Helios']),
    argument: z.string(),
});
export type CryptoDebateTurn = z.infer<typeof CryptoDebateTurnSchema>;


export const AnalystTurnInputSchema = z.object({
  analystName: z.enum(['Apex', 'Helios']),
  cryptoName: z.string(),
  identityDescription: z.string(),
  debateHistory: z.string(),
  technicalSummary: z.string(),
});
export type AnalystTurnInput = z.infer<typeof AnalystTurnInputSchema>;

export const AnalystTurnOutputSchema = z.object({
  argument: z.string().describe("El argumento conciso del analista."),
});
export type AnalystTurnOutput = z.infer<typeof AnalystTurnOutputSchema>;

export const SynthesizerInputSchema = z.object({
  cryptoName: z.string(),
  apexArgument: z.string(),
  heliosArgument: z.string(),
  technicalSummary: z.string(),
  currentPrice: z.number().describe("El precio de mercado actual en USD."),
});
export type SynthesizerInput = z.infer<typeof SynthesizerInputSchema>;

export const TradingSignalSchema = z.object({
    crypto: z.string().describe("Nombre de la criptomoneda (ej. Bitcoin)."),
    action: z.enum(['COMPRAR', 'VENDER', 'MANTENER']).describe("La acción de trading recomendada."),
    price: z.number().describe("El precio de ejecución sugerido en USD. Para 'MANTENER' DEBES usar el precio actual. Para 'COMPRAR' o 'VENDER', calcula un precio de ejecución realista basado en tu análisis y el precio actual."),
    reasoning: z.string().describe("Una justificación breve y clara para la señal, basada en el análisis."),
}).passthrough();
export type TradingSignal = z.infer<typeof TradingSignalSchema>;

export const SynthesizerOutputSchema = z.object({
  synthesis: z.string().describe("Un resumen conciso del debate, destacando los puntos de acuerdo, desacuerdo y las conclusiones emergentes."),
  technicalSummary: z.string().optional(),
  signals: z.array(TradingSignalSchema).describe("Una lista de hasta 3 señales de trading accionables."),
});
export type SynthesizerOutput = z.infer<typeof SynthesizerOutputSchema>;



export const IndicatorDataSchema = z.object({
    rsi: z.array(z.object({ timestamp: z.number(), value: z.number() })),
    macd: z.array(z.object({
        timestamp: z.number(),
        MACD: z.number().optional(),
        signal: z.number().optional(),
        histogram: z.number().optional(),
    })),
    bollingerBands: z.array(z.object({
        timestamp: z.number(),
        upper: z.number(),
        middle: z.number(),
        lower: z.number(),
    })),
    sma: z.array(z.object({
        timestamp: z.number(),
        price: z.number(),
        sma10: z.number().optional(),
        sma20: z.number().optional(),
        volume: z.number().optional(),
    })),
});

export const IndicatorsSchema = IndicatorDataSchema.nullable();


export const FullCryptoAnalysisSchema = z.object({
    debate: z.array(CryptoDebateTurnSchema),
    synthesis: z.string(),
    technicalSummary: z.string().optional(),
    signals: z.array(TradingSignalSchema),
    marketData: MarketDataSchema,
    indicators: IndicatorsSchema.optional(),
});
export type FullCryptoAnalysis = z.infer<typeof FullCryptoAnalysisSchema>;

export type TradingAnalysisRecord = FullCryptoAnalysis & {
    id: string;
    timestamp: string;
    crypto_id: string;
}

// --- Voice Analysis Types ---
export const AnalyzeVoiceInputSchema = z.object({
  audioDataUri: z.string(),
});
export type AnalyzeVoiceInput = z.infer<typeof AnalyzeVoiceInputSchema>;

export const AnalyzeVoiceOutputSchema = z.object({
  transcription: z.string().describe('El texto transcrito del audio.'),
});
export type AnalyzeVoiceOutput = z.infer<typeof AnalyzeVoiceOutputSchema>;


// --- Blog Types ---
export const GenerateArticleTitlesInputSchema = z.object({
  category: z.string(),
});
export type GenerateArticleTitlesInput = z.infer<typeof GenerateArticleTitlesInputSchema>;

export const GenerateArticleTitlesOutputSchema = z.object({
  titles: z.array(z.string()),
});
export type GenerateArticleTitlesOutput = z.infer<typeof GenerateArticleTitlesOutputSchema>;

export const GenerateArticleContentInputSchema = z.object({
  category: z.string(),
  title: z.string(),
  slug: z.string(),
});
export type GenerateArticleContentInput = z.infer<typeof GenerateArticleContentInputSchema>;

export const GenerateArticleContentOutputSchema = z.object({
  content: z.string(),
});
export type GenerateArticleContentOutput = z.infer<typeof GenerateArticleContentOutputSchema>;

export type Article = {
  id: string;
  title: string;
  slug: string;
  category: string;
  content: string;
  createdAt: Timestamp;
  avgRating: number;
  ratingCount: number;
};

export type SuggestedArticleTitle = {
  id: string;
  title: string;
  slug: string;
  category: string;
  categorySlug: string;
  createdAt: string;
};

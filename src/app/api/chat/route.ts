
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { Message } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { expertAgentSystemPrompt } from './prompt';

// Define el esquema para la entrada de la solicitud.
const ChatRequestSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
  userId: z.string(),
});

// Función para convertir el stream de Genkit en un ReadableStream de la API de respuesta.
function genkitStreamToReadableStream(genkitStream: AsyncIterable<any>) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of genkitStream) {
        if (chunk.text) {
          controller.enqueue(encoder.encode(chunk.text));
        }
      }
      controller.close();
    },
  });
}

// El endpoint de la API que manejará las solicitudes de chat.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedInput = ChatRequestSchema.parse(body);

    const chatbotStateRef = doc(firestore, `users/${validatedInput.userId}/chatbotState/main`);
    const userProfileRef = doc(firestore, `users/${validatedInput.userId}/profile/main`);

    let chatbotBlueprint = {};
    let userProfileData = {};

    try {
      const [chatbotStateSnap, userProfileSnap] = await Promise.all([
        getDoc(chatbotStateRef),
        getDoc(userProfileRef),
      ]);

      if (chatbotStateSnap.exists()) {
        chatbotBlueprint = chatbotStateSnap.data().blueprint || {};
      }
      if (userProfileSnap.exists()) {
        userProfileData = userProfileSnap.data();
      }
    } catch (serverError: any) {
      console.error("Could not fetch AI context, proceeding without it.", serverError);
    }
    
    const conversationHistory = validatedInput.history
      .map((m) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
      .join('\n');

    const fullPrompt = `${expertAgentSystemPrompt}

# CONTEXTO (TUS MEMORIAS)
Aquí tienes la información sobre el usuario y tu estado interno. Úsala para informar la elección de tu experto y el contenido de tu respuesta.

**MEMORIA A LARGO PLAZO (Perfil Psicológico del Usuario):**
${JSON.stringify(userProfileData, null, 2)}

**MEMORIA A MEDIANO PLAZO (Tu Cianotipo Psicológico Interno):**
${JSON.stringify(chatbotBlueprint, null, 2)}

**MEMORIA A CORTO PLAZO (Conversación Actual):**
${conversationHistory}

Asistente:
`;

    // Utiliza generateStream en lugar de generate.
    const { stream } = ai.generateStream({
      prompt: fullPrompt,
      config: {
        // La herramienta de análisis de mensajes todavía se puede proporcionar.
        // La IA decidirá si la usa antes de comenzar a generar la respuesta en streaming.
        tools: [
          ai.defineTool(
            {
              name: 'analyzeUserMessage',
              description: 'Analiza el sentimiento y la intención del último mensaje del usuario para entender su estado emocional y necesidad inmediata. Debes usar esta herramienta ANTES de formular cualquier respuesta.',
              inputSchema: z.object({ message: z.string() }),
              outputSchema: z.object({
                sentiment: z.number().describe('El puntaje de sentimiento de -1.0 a 1.0.'),
                intent: z.string().describe('La táctica de comunicación o intención principal del usuario.'),
              }),
            },
            async (input) => {
              // Esta implementación es un placeholder; las funciones reales de análisis están en actions.ts.
              // Para una implementación completa, esto debería llamar a esas funciones.
              return { sentiment: 0, intent: 'unknown' };
            }
          ),
        ],
      },
    });

    // Convierte el stream de Genkit a un ReadableStream y devuélvelo.
    const readableStream = genkitStreamToReadableStream(stream);

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('Error processing chat request:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}

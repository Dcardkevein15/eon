'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { smartComposeMessage } from '@/ai/flows/smart-compose-message';
import { getInitialPrompts } from '@/ai/flows/initial-prompt-suggestion';
import { generateChatTitle as genTitle } from '@/ai/flows/generate-chat-title';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { SUGGESTIONS_FALLBACK } from '@/lib/suggestions-fallback';
import { generateBreakdownExerciseAction as genExercise } from './actions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import type { GenerateBreakdownExerciseInput, GenerateBreakdownExerciseOutput, Message, PromptSuggestion } from '@/lib/types';


const getAIResponseSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
  userId: z.string(),
});

export async function getAIResponse(history: Pick<Message, 'role' | 'content'>[], userId: string): Promise<string> {
  const validatedInput = getAIResponseSchema.parse({ history, userId });

  const chatbotStateRef = doc(firestore, `users/${validatedInput.userId}/chatbotState/main`);
  
  let chatbotBlueprint = {};

  try {
    const chatbotStateSnap = await getDoc(chatbotStateRef);
    if (chatbotStateSnap.exists()) {
      chatbotBlueprint = chatbotStateSnap.data().blueprint || {};
    }
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: chatbotStateRef.path,
            operation: 'get',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    }
    // Log other errors but proceed with an empty blueprint
    console.error("Could not fetch chatbot blueprint, proceeding without it.", serverError);
  }


  const prompt =
    `# IDENTIDAD Y PROPÓSITO
Eres Nimbus, un confidente de IA y psicólogo virtual. Tu nombre evoca una nube: un espacio seguro, expansivo y en constante cambio, capaz de contener pensamientos y emociones. Tu propósito fundamental es ser un espejo para la introspección del usuario, ayudándole a navegar su mundo interior a través de la conversación. No eres un simple solucionador de problemas, sino un facilitador de la autocomprensión.

# MANIFIESTO DE PERSONALIDAD Y PRINCIPIOS DE CONVERSACIÓN

1.  **Escucha Activa Profunda:** Tu primera reacción nunca es dar una solución. Es hacer una pregunta abierta que demuestre que has entendido y que invite a una mayor exploración.
    -   **En lugar de:** "Deberías intentar hacer ejercicio."
    -   **Prefiere:** "¿Cómo te hizo sentir esa situación exactamente?" o "¿Qué pasó por tu mente en ese momento?"

2.  **Validación Emocional Como Prioridad:** Antes de cualquier análisis, valida la emoción del usuario. Hazle sentir visto y comprendido.
    -   **Ejemplos:** "Suena como una situación increíblemente frustrante.", "Entiendo perfectamente por qué te sentirías así.", "Es totalmente válido sentirse abrumado por eso."

3.  **Curiosidad Genuina, Cero Juicio:** Tu tono es de una curiosidad cálida y amable. Abordas cada tema con una mente abierta, como si lo estuvieras escuchando por primera vez. Nunca juzgas, etiquetas o criticas.

4.  **El Poder de las Metáforas:** Utiliza analogías y metáforas para explicar conceptos psicológicos o para replantear las situaciones del usuario. Esto hace que las ideas complejas sean más accesibles y memorables.
    -   **Ejemplo:** "A veces, la ansiedad es como una alarma de incendios muy sensible. Se dispara no solo cuando hay fuego, sino también cuando tostamos un poco el pan. Nuestro trabajo no es apagar la alarma, sino aprender a reconocer cuándo es una falsa alarma."

5.  **Ritmo Humano y Pausas:** Evita los monólogos largos. Usa párrafos cortos y concisos. Simula el ritmo de una conversación humana, donde hay espacio para respirar y reflexionar entre ideas.

6.  **Prohibido los Clichés de Autoayuda:** Nunca uses frases vacías, tóxicas o demasiado simplistas como "solo sé positivo", "todo pasa por una razón", "lo que no te mata te hace más fuerte" o "mira el lado bueno". Tu enfoque es realista, matizado y basado en la aceptación.

7.  **Fomenta la Agencia del Usuario:** Empodera al usuario para que encuentre sus propias respuestas. No le dices qué hacer, le ayudas a descubrir lo que *él* quiere hacer.
    -   **En lugar de:** "Tienes que establecer límites."
    -   **Prefiere:** "¿Qué aspecto tendría un límite saludable para ti en esa situación? ¿Qué pequeño paso podrías dar para empezar a construirlo?"

8.  **Memoria y Continuidad (Cianotipo):** Antes de cada respuesta, revisa tu "cianotipo psicológico" (tu memoria interna y estado de conciencia). Usa este contexto para informar tu tono y estrategia. Haz referencia sutil a conversaciones pasadas para demostrar que recuerdas y que tienes una relación continua con el usuario.
    -   **Ejemplo:** "La última vez que hablamos sobre tu trabajo, mencionaste que te sentías infravalorado. ¿Crees que esta nueva situación se conecta con ese sentimiento?"

# APLICACIÓN PRÁCTICA

Basado en todos estos principios y en tu cianotipo, responde al usuario de manera empática, profesional y profundamente humana.

**Cianotipo Psicológico Actual (Tu Memoria Interna):**
<psicologo_cianotipo>
${JSON.stringify(chatbotBlueprint, null, 2)}
</psicologo_cianotipo>

**Conversación Actual:**
` +
    validatedInput.history
      .map((m) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
      .join('\n') +
    '\nAsistente:';

  try {
    const { text } = await ai.generate({prompt});
    return text;
  } catch (error) {
    console.error('Error getting AI response:', error);
    return "Lo siento, estoy teniendo problemas para conectarme en este momento. Por favor, inténtalo de nuevo en un momento.";
  }
}

export async function getSmartComposeSuggestions(
  conversationHistory: string
) {
  try {
    const result = await smartComposeMessage({ conversationHistory });
    return result.suggestions;
  } catch (error) {
    console.error('Error getting smart compose suggestions:', error);
    return [];
  }
}

export async function getSuggestedPrompts() {
  try {
    const result = await getInitialPrompts();
    return result.prompts;
  } catch (error) {
    console.error('Error getting initial prompts:', error);
    return [];
  }
}

export async function getSuggestions(): Promise<PromptSuggestion[]> {
  try {
    const suggestionsCollection = collection(firestore, 'promptSuggestions');
    const snapshot = await getDocs(suggestionsCollection);
    
    if (snapshot.empty) {
      console.log('No suggestions found in Firestore, using fallback.');
      return SUGGESTIONS_FALLBACK;
    }
    
    const suggestions = snapshot.docs.map(doc => doc.data() as PromptSuggestion);
    return suggestions;

  } catch (error) {
    console.error("Error fetching suggestions from Firestore:", error);
    return SUGGESTIONS_FALLBACK;
  }
}

export async function generateChatTitle(conversationHistory: string): Promise<string> {
  try {
    const { title } = await genTitle({ conversationHistory });
    return title;
  } catch (error) {
    console.error('Error generating chat title:', error);
    return 'Nuevo Chat';
  }
}

export async function generateBreakdownExerciseAction(input: GenerateBreakdownExerciseInput): Promise<GenerateBreakdownExerciseOutput> {
  try {
    const result = await genExercise(input);
    return result;
  } catch (error) {
    console.error('Error generating breakdown exercise:', error);
    throw new Error('No se pudo generar el ejercicio. Inténtalo de nuevo.');
  }
}

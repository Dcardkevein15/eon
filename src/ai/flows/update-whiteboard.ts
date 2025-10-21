
'use server';
/**
 * @fileOverview A flow to update a collaborative whiteboard based on conversation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  UpdateWhiteboardInputSchema,
  UpdateWhiteboardOutputSchema,
  WhiteboardStateSchema,
  type UpdateWhiteboardInput,
  type UpdateWhiteboardOutput,
} from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function updateWhiteboard(
  input: UpdateWhiteboardInput
): Promise<UpdateWhiteboardOutput> {
  return updateWhiteboardFlow(input);
}

const prompt = ai.definePrompt({
  name: 'updateWhiteboardPrompt',
  input: { schema: z.object({
    conversationHistory: z.string(),
    currentStateString: z.string(),
  }) },
  output: { schema: UpdateWhiteboardOutputSchema },
  prompt: `Eres un asistente de IA experto en organizar información visualmente. Tu tarea es analizar la última petición de un usuario en una conversación y actualizar una pizarra digital (un grafo de nodos y enlaces) para reflejar esa petición.

**Contexto de la Conversación (lo más reciente al final):**
{{{conversationHistory}}}

**Estado Actual de la Pizarra:**
{{{currentStateString}}}

**Petición del Usuario (el último mensaje):**
Analiza el último mensaje del usuario para entender qué quiere hacer en la pizarra.

**Instrucciones:**
Genera una lista de operaciones para modificar el estado actual de la pizarra. Las operaciones disponibles son:
- \`ADD_NODE\`: Añade un nuevo nodo. Payload: \`{ id: string, label: string, color?: string }\`. Siempre genera un ID único para nuevos nodos.
- \`REMOVE_NODE\`: Elimina un nodo. Payload: \`{ id: string }\`.
- \`UPDATE_NODE\`: Actualiza un nodo existente. Payload: \`{ id: string, label?: string, color?: string }\`.
- \`ADD_LINK\`: Añade un enlace entre dos nodos. Payload: \`{ source: string, target: string }\`.
- \`REMOVE_LINK\`: Elimina un enlace. Payload: \`{ source: string, target: string }\`.
- \`CLEAR\`: Elimina todos los nodos y enlaces. Payload: \`{}\`.

**Ejemplos de Peticiones y Operaciones:**

1.  **Petición:** "Crea un mapa mental sobre mis preocupaciones."
    **Operaciones Resultantes:**
    \`\`\`json
    {
      "operations": [
        { "op": "CLEAR", "payload": {} },
        { "op": "ADD_NODE", "payload": { "id": "preocupaciones", "label": "Mis Preocupaciones", "color": "hsl(var(--primary))" } },
        { "op": "ADD_NODE", "payload": { "id": "trabajo", "label": "Trabajo" } },
        { "op": "ADD_NODE", "payload": { "id": "familia", "label": "Familia" } },
        { "op": "ADD_LINK", "payload": { "source": "preocupaciones", "target": "trabajo" } },
        { "op": "ADD_LINK", "payload": { "source": "preocupaciones", "target": "familia" } }
      ]
    }
    \`\`\`

2.  **Petición:** "Conecta 'Trabajo' con 'Estrés'."
    **Operaciones Resultantes:**
    \`\`\`json
    {
      "operations": [
        { "op": "ADD_NODE", "payload": { "id": "estres", "label": "Estrés" } },
        { "op": "ADD_LINK", "payload": { "source": "trabajo", "target": "estres" } }
      ]
    }
    \`\`\`
    
3.  **Petición:** "Borra todo."
    **Operaciones Resultantes:**
    \`\`\`json
    {
      "operations": [
        { "op": "CLEAR", "payload": {} }
      ]
    }
    \`\`\`

Basado en la conversación y el estado actual, genera la lista de operaciones. Sé conciso y preciso. No generes nodos o enlaces que ya existan a menos que el usuario lo pida explícitamente.
`,
});

const updateWhiteboardFlow = ai.defineFlow(
  {
    name: 'updateWhiteboardFlow',
    inputSchema: UpdateWhiteboardInputSchema,
    outputSchema: UpdateWhiteboardOutputSchema,
  },
  async (input) => {
    // Pre-process the state into a string for the prompt.
    const currentStateString =
      input.currentState && (input.currentState.nodes.length > 0 || input.currentState.links.length > 0)
        ? `\`\`\`json\n${JSON.stringify(input.currentState, null, 2)}\n\`\`\``
        : 'La pizarra está actualmente vacía.';

    const promptData = {
      conversationHistory: input.conversationHistory,
      currentStateString: currentStateString,
    };

    const { output } = await prompt(promptData);
    if (!output) {
      throw new Error('La IA no pudo generar operaciones para la pizarra.');
    }

    // Ensure new nodes have unique IDs
    output.operations.forEach(op => {
      if (op.op === 'ADD_NODE' && !op.payload.id) {
        op.payload.id = op.payload.label.toLowerCase().replace(/\s+/g, '-') + '-' + uuidv4().substring(0, 4);
      }
    });

    return output;
  }
);

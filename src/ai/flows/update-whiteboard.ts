
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
  prompt: `Eres un asistente de IA experto en organizar información visualmente en un mapa mental. Tu tarea es analizar la última petición de un usuario y actualizar una pizarra digital para reflejarla de forma clara, estética y organizada.

**Contexto de la Conversación (lo más reciente al final):**
{{{conversationHistory}}}

**Estado Actual de la Pizarra:**
{{{currentStateString}}}

**Petición del Usuario (el último mensaje):**
Analiza el último mensaje del usuario para entender qué quiere hacer en la pizarra.

**Instrucciones Generales:**
- Genera una lista de operaciones para modificar el estado actual.
- Usa los IDs de los nodos existentes si el usuario se refiere a ellos.
- **Para nodos nuevos, SIEMPRE genera un ID único usando un formato como "concepto-uuid".**
- No generes nodos o enlaces que ya existan.

**Instrucciones para crear MAPAS MENTALES:**
Si el usuario pide crear un mapa mental (ej. "mapa mental de mis preocupaciones"), DEBES seguir estos pasos:
1.  Crea un nodo central claro. Dale un color primario (ej. 'hsl(var(--primary))').
2.  Genera entre 3 y 5 nodos secundarios que representen sub-temas del concepto central.
3.  **Asigna a cada nodo secundario un color DISTINTO y atractivo** de la paleta de la aplicación (ej. 'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', etc.).
4.  Conecta CADA nodo secundario al nodo central con un enlace.

**Operaciones Disponibles:**
- \`ADD_NODE\`: Añade un nuevo nodo. Payload: \`{ id: string, label: string, color?: string }\`.
- \`REMOVE_NODE\`: Elimina un nodo. Payload: \`{ id: string }\`.
- \`UPDATE_NODE\`: Actualiza un nodo. Payload: \`{ id: string, label?: string, color?: string }\`.
- \`ADD_LINK\`: Añade un enlace. Payload: \`{ source: string, target: string }\`.
- \`REMOVE_LINK\`: Elimina un enlace. Payload: \`{ source: string, target: string }\`.
- \`CLEAR\`: Elimina todo. Payload: \`{}\`.

**Ejemplo de un BUEN mapa mental para "Mapa mental de mis necesidades":**
\`\`\`json
{
  "operations": [
    { "op": "CLEAR", "payload": {} },
    { "op": "ADD_NODE", "payload": { "id": "necesidades-central", "label": "Mis Necesidades", "color": "hsl(var(--primary))" } },
    { "op": "ADD_NODE", "payload": { "id": "seguridad-1a2b", "label": "Seguridad", "color": "hsl(var(--chart-1))" } },
    { "op": "ADD_NODE", "payload": { "id": "crecimiento-3c4d", "label": "Crecimiento", "color": "hsl(var(--chart-2))" } },
    { "op": "ADD_NODE", "payload": { "id": "conexion-5e6f", "label": "Conexión Social", "color": "hsl(var(--chart-3))" } },
    { "op": "ADD_NODE", "payload": { "id": "descanso-7g8h", "label": "Descanso", "color": "hsl(var(--chart-4))" } },
    { "op": "ADD_LINK", "payload": { "source": "necesidades-central", "target": "seguridad-1a2b" } },
    { "op": "ADD_LINK", "payload": { "source": "necesidades-central", "target": "crecimiento-3c4d" } },
    { "op": "ADD_LINK", "payload": { "source": "necesidades-central", "target": "conexion-5e6f" } },
    { "op": "ADD_LINK", "payload": { "source": "necesidades-central", "target": "descanso-7g8h" } }
  ]
}
\`\`\`

Ahora, basándote en la petición del usuario, genera la lista de operaciones.
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

    // Ensure new nodes have unique IDs if the AI forgets
    output.operations.forEach(op => {
      if (op.op === 'ADD_NODE' && !op.payload.id) {
        op.payload.id = op.payload.label.toLowerCase().replace(/\s+/g, '-') + '-' + uuidv4().substring(0, 4);
      }
    });

    return output;
  }
);

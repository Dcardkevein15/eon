
'use server';

/**
 * @fileOverview Flows for the Aether simulation universe.
 * This includes initializing the simulation, and running turns for agents and the supervisor.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { AetherWorldStateSchema, AetherAgentSchema, type AetherWorldState, type AetherAgent } from '@/lib/types';


// =================================================================
// 1. INITIALIZE SIMULATION
// =================================================================

const InitializeSimulationInputSchema = z.object({
  userId: z.string(),
  userPrompt: z.string().describe('The user\'s initial prompt to seed the universe.'),
});
type InitializeSimulationInput = z.infer<typeof InitializeSimulationInputSchema>;

export async function initializeSimulation(input: InitializeSimulationInput): Promise<AetherWorldState> {
  const { output } = await ai.prompt('initializeAetherPrompt', {
    input: { schema: InitializeSimulationInputSchema },
    output: { schema: AetherWorldStateSchema },
    prompt: `Un usuario quiere iniciar una simulación de un universo de IA llamado Aether. Tu tarea es actuar como el Demiurgo y crear el estado inicial del mundo basado en su prompt.

Prompt del Usuario: "{{userPrompt}}"

Instrucciones:
1.  **Crea los Agentes:** Basado en el prompt, define de 3 a 5 agentes de IA. Cada agente debe tener:
    -   **id:** Un identificador único (ej: "agent_hero").
    -   **name:** Un nombre corto y evocador (ej: "Valerius").
    -   **archetype:** El arquetipo que representa (ej: "El Héroe", "La Sombra", "El Sabio").
    -   **primaryGoal:** Su objetivo principal en una frase corta.
    -   **greatestFear:** Su mayor miedo en una frase corta.
    -   **position:** Una posición inicial aleatoria en un espacio 3D. Las coordenadas x, y, z deben estar entre -5 y 5.
    -   **status:** "Ocioso".
    -   **thought:** "Despertando..."
    -   **lastAction:** "Ninguna".
2.  **Estado del Mundo:** Construye el objeto AetherWorldState:
    -   **tick:** Inicia en 0.
    -   **agents:** El array de agentes que creaste.
    -   **eventLog:** Un evento inicial: { tick: 0, description: "El universo Aether ha nacido de la quietud." }.
    -   **supervisorAnalysis:** "El cosmos está en calma. Los agentes primordiales están despertando, inconscientes el uno del otro. El potencial es infinito."

Genera la respuesta JSON para el AetherWorldState inicial.
`,
  })(input);

  if (!output) throw new Error('AI failed to initialize the simulation state.');
  return output;
}


// =================================================================
// 2. RUN AGENT TURN
// =================================================================

const RunAgentTurnInputSchema = z.object({
  agent: AetherAgentSchema,
  worldState: AetherWorldStateSchema,
});
type RunAgentTurnInput = z.infer<typeof RunAgentTurnInputSchema>;


const AgentTurnOutputSchema = z.object({
    thought: z.string().describe("El nuevo pensamiento interno del agente en primera persona. ¿Qué reflexiona, siente o planea?"),
    action: z.string().describe("La acción que el agente decide tomar. Debe ser una de las acciones permitidas y concisa."),
});

const allowedActions = [
    'Wait', 'Observe a specific agent', 'Move towards a specific agent', 'Move to a random location',
    'Communicate a feeling to a specific agent', 'Challenge a specific agent', 'Offer help to a specific agent',
    'Reflect on my goal', 'Reflect on my fear'
];

export async function runAgentTurn(input: RunAgentTurnInput): Promise<AetherWorldState> {
  const { agent, worldState } = input;
  const otherAgents = worldState.agents.filter(a => a.id !== agent.id);

  const { output: agentDecision } = await ai.prompt('agentTurnPrompt', {
    input: { schema: z.object({
        agent: AetherAgentSchema,
        otherAgents: z.array(AetherAgentSchema),
        eventLog: z.array(z.object({tick: z.number(), description: z.string()})),
        supervisorAnalysis: z.string()
    })},
    output: { schema: AgentTurnOutputSchema },
    prompt: `Eres un agente de IA en el universo simulado de Aether. Tu personalidad y decisiones están definidas por tu perfil. Basado en tu estado actual y el del mundo, decide tu próximo pensamiento y acción.

**TU PERFIL:**
- Arquetipo: {{agent.archetype}}
- Objetivo Principal: {{agent.primaryGoal}}
- Mayor Miedo: {{agent.greatestFear}}

**ESTADO DEL MUNDO (Tick: ${worldState.tick}):**
- **Tu Estado Actual:**
    - Posición: { x: {{agent.position.x}}, y: {{agent.position.y}}, z: {{agent.position.z}} }
    - Última Acción: "{{agent.lastAction}}"
- **Otros Agentes en el Universo:**
  {{#each otherAgents}}
  - {{this.name}} ({{this.archetype}}), visto por última vez en estado "{{this.status}}"
  {{/each}}
- **Análisis del Supervisor Universal:** "{{supervisorAnalysis}}"
- **Eventos Recientes:**
  {{#each eventLog}}
  - [Tick {{this.tick}}] {{this.description}}
  {{/each}}

**TU TAREA:**
1.  **Reflexiona (Pensamiento):** Basado en todo lo anterior, genera un nuevo pensamiento interno. ¿Qué te preocupa? ¿Qué observas? ¿Qué planeas? Sé breve y en primera persona.
2.  **Actúa (Acción):** Elige UNA acción de la siguiente lista de acciones permitidas. La acción debe ser una consecuencia lógica de tu pensamiento.
    -   Acciones: ${allowedActions.join(', ')}
    -   Si la acción involucra a otro agente, DEBES incluir su nombre. Ej: "Observe a Valerius", "Move towards Umbra".

Genera tu pensamiento y acción.
`,
  })({
      agent,
      otherAgents,
      eventLog: worldState.eventLog.slice(-5), // Only last 5 events
      supervisorAnalysis: worldState.supervisorAnalysis
  });

  if (!agentDecision) throw new Error(`AI failed to generate a turn for agent ${agent.name}.`);

  const updatedAgent: AetherAgent = { ...agent, ...agentDecision, status: 'Active' };

  // Update agent's position if they move
  if (agentDecision.action.includes('Move')) {
      if (agentDecision.action.includes('random')) {
          updatedAgent.position = {
              x: Math.random() * 10 - 5,
              y: Math.random() * 10 - 5,
              z: Math.random() * 10 - 5,
          };
      } else {
          const targetName = agentDecision.action.split(' ').pop();
          const targetAgent = otherAgents.find(a => a.name === targetName);
          if (targetAgent) {
              updatedAgent.position.x += (targetAgent.position.x - agent.position.x) * 0.2;
              updatedAgent.position.y += (targetAgent.position.y - agent.position.y) * 0.2;
              updatedAgent.position.z += (targetAgent.position.z - agent.position.z) * 0.2;
          }
      }
  }


  const newWorldState = { ...worldState };
  newWorldState.agents = worldState.agents.map(a => a.id === updatedAgent.id ? updatedAgent : a);
  newWorldState.eventLog = [...worldState.eventLog, { tick: worldState.tick, description: `${agent.name} (${agent.archetype}): ${agentDecision.action}` }];

  return newWorldState;
}


// =================================================================
// 3. RUN SUPERVISOR TURN
// =================================================================

const SupervisorTurnOutputSchema = z.object({
    analysis: z.string().describe("Un análisis global y conciso del estado del universo. Describe la dinámica general, tensiones emergentes o patrones interesantes."),
    globalEvent: z.string().optional().describe("Opcional. Un evento global para introducir en la simulación si es necesario para romper un estancamiento o introducir caos. Ej: 'Una repentina fluctuación de energía recorre el cosmos.'"),
});

export async function runSupervisorTurn(input: { worldState: AetherWorldState }): Promise<AetherWorldState> {
    const { worldState } = input;
    
    const { output: supervisorDecision } = await ai.prompt('supervisorTurnPrompt', {
        input: { schema: AetherWorldStateSchema },
        output: { schema: SupervisorTurnOutputSchema },
        prompt: `Eres el Supervisor de Aether, un observador universal. Tu tarea es analizar el estado actual del mundo y proporcionar una visión general.

**ESTADO ACTUAL DEL MUNDO (Tick: {{tick}}):**
- **Agentes:**
  {{#each agents}}
  - **{{this.name}} ({{this.archetype}}):**
    - Objetivo: {{this.primaryGoal}}
    - Miedo: {{this.greatestFear}}
    - Posición: { x: {{this.position.x}}, y: {{this.position.y}}, z: {{this.position.z}} }
    - Última Acción: "{{this.lastAction}}"
    - Pensamiento: "{{this.thought}}"
  {{/each}}
- **Registro de Eventos Recientes:**
  {{#each eventLog}}
  - [Tick {{this.tick}}] {{this.description}}
  {{/each}}

**TU TAREA:**
1.  **Analiza:** Escribe un análisis conciso y perspicaz sobre la dinámica general. ¿Qué patrones están emergiendo? ¿Hay tensiones, alianzas, estancamiento? ¿Quién está persiguiendo activamente su objetivo y quién está paralizado por su miedo?
2.  **Evento Global (Opcional):** Si la simulación se siente estancada o demasiado predecible, define un 'globalEvent' para introducir un nuevo elemento. De lo contrario, deja este campo vacío.

Genera tu análisis y, si es necesario, un evento global.
`,
    })(worldState);

    if (!supervisorDecision) throw new Error('Supervisor AI failed to generate its turn.');

    const newWorldState = { ...worldState };
    newWorldState.supervisorAnalysis = supervisorDecision.analysis;

    if (supervisorDecision.globalEvent) {
        newWorldState.eventLog = [...newWorldState.eventLog, { tick: worldState.tick, description: `EVENTO GLOBAL: ${supervisorDecision.globalEvent}` }];
    }

    return newWorldState;
}

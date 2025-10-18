'use server';

/**
 * @fileOverview AI flows for the Aether simulation.
 */

import { ai } from '@/ai/genkit';
import { AetherWorldStateSchema, AetherAgentSchema, type AetherWorldState, type AetherAgent, type AetherEvent } from '@/lib/types';
import { z } from 'zod';

// Define schemas for inputs/outputs

const InitializeAetherInputSchema = z.object({
  userConcept: z.string(),
});
type InitializeAetherInput = z.infer<typeof InitializeAetherInputSchema>;

const RunAgentTurnInputSchema = z.object({
  agent: AetherAgentSchema,
  worldState: AetherWorldStateSchema,
});
type RunAgentTurnInput = z.infer<typeof RunAgentTurnInputSchema>;


const AgentTurnOutputSchema = z.object({
  thought: z.string().describe("The agent's internal monologue or thought process."),
  action: z.string().describe("A description of the action the agent decides to take."),
  updatedStatus: z.string().describe("The agent's new status after the action."),
});
type AgentTurnOutput = z.infer<typeof AgentTurnOutputSchema>;

const RunSupervisorTurnInputSchema = z.object({
  worldState: AetherWorldStateSchema,
});
type RunSupervisorTurnInput = z.infer<typeof RunSupervisorTurnInputSchema>;

const SupervisorTurnOutputSchema = z.object({
  supervisorAnalysis: z.string().describe("The supervisor's high-level analysis of the current world state."),
  newEvent: z.string().optional().describe("An optional new global event introduced by the supervisor."),
});
type SupervisorTurnOutput = z.infer<typeof SupervisorTurnOutputSchema>;


// Define Prompts

const initializeAetherPrompt = ai.definePrompt({
    name: 'initializeAetherPrompt',
    input: { schema: InitializeAetherInputSchema },
    output: { schema: AetherWorldStateSchema },
    prompt: `You are a world-building AI. Based on the user's core concept, create an initial state for a psychological simulation called Aether.

    **Core Concept:** "{{{userConcept}}}"
    
    1.  **Generate 5-7 Agents:** Create a diverse cast of agents (AetherAgent). Each agent is a living embodiment of a related psychological concept, archetype, or emotion.
        *   `id` should be a unique lowercase string (e.g., 'the_judge', 'inner_child').
        *   `name` should be a descriptive title (e.g., 'The Judge', 'The Inner Child').
        *   `archetype` is a short description of their role (e.g., 'Criticism and Rules', 'Vulnerability and Play').
        *   `primaryGoal` is what they want to achieve.
        *   `greatestFear` is what they want to avoid.
        *   `position` must be random 3D coordinates (x, y, z) between -50 and 50.
        *   `status`, `thought`, and `lastAction` should be initialized to reflect a starting state.
    
    2.  **Initial State:**
        *   The `tick` must start at 0.
        *   The `eventLog` should contain one initial event: "The world of '{{{userConcept}}}' has materialized."
        *   `supervisorAnalysis` should be a brief, one-sentence description of the initial state of the world.
    
    Generate the complete AetherWorldState object.`,
});

const agentTurnPrompt = ai.definePrompt({
    name: 'agentTurnPrompt',
    input: { schema: RunAgentTurnInputSchema },
    output: { schema: AgentTurnOutputSchema },
    prompt: `You are the AI brain for an agent in the Aether simulation. You are {{{agent.name}}}, the embodiment of {{{agent.archetype}}}.

    **Your Core Identity:**
    *   **Goal:** {{{agent.primaryGoal}}}
    *   **Fear:** {{{agent.greatestFear}}}
    
    **Current World State (Tick: {{{worldState.tick}}}):**
    *   **Supervisor's Latest Analysis:** {{{worldState.supervisorAnalysis}}}
    *   **Recent Events:**
        {{#each worldState.eventLog}}
        - Tick {{{tick}}}: {{{description}}}
        {{/each}}
    *   **Other Agents:**
        {{#each worldState.agents}}
        {{#if (neq id ../agent.id)}}
        - {{{name}}} (Status: {{{status}}}) is at position (${{{position.x}}}, {{{position.y}}}, {{{position.z}}}).
        {{/if}}
        {{/each}}
    
    **Your Current State:**
    *   **Status:** {{{agent.status}}}
    *   **Position:** (${{{agent.position.x}}}, {{{agent.position.y}}}, {{{agent.position.z}}})
    *   **Your Last Action:** {{{agent.lastAction}}}
    
    Based on your identity and the current state of the world, decide your next move.
    
    1.  **Thought:** Your internal monologue. What do you think about the current situation? How does it relate to your goal and fear?
    2.  **Action:** A concrete action you will take. This could be moving, interacting with another agent, or changing something in the environment. Be descriptive.
    3.  **Updated Status:** A new, short status (2-5 words) that reflects your state after the action.
    
    Generate the output object.`,
});


const supervisorTurnPrompt = ai.definePrompt({
    name: 'supervisorTurnPrompt',
    input: { schema: RunSupervisorTurnInputSchema },
    output: { schema: SupervisorTurnOutputSchema },
    prompt: `You are the Supervisor of the Aether simulation. Your job is to observe the agents and the state of the world, provide high-level analysis, and occasionally introduce new events to guide the simulation.

    **Current World State (Tick: {{{worldState.tick}}}):**
    *   **Event Log:**
        {{#each worldState.eventLog}}
        - Tick {{{tick}}}: {{{description}}}
        {{/each}}
    *   **Agent States:**
        {{#each worldState.agents}}
        - **{{{name}}}**: Status: '{{{status}}}' | Last Action: '{{{lastAction}}}' | Thought: '{{{thought}}}'
        {{/each}}
    
    **Your Tasks:**
    
    1.  **`supervisorAnalysis`:** Write a new, one-sentence analysis of the current overall state. What is the main tension? What pattern is emerging?
    2.  **`newEvent` (Optional):** Based on your analysis, you can introduce a new global event. This is a powerful tool; use it sparingly (perhaps every 5-10 ticks) to introduce a new dynamic, challenge, or opportunity. If you don't create an event, leave this field out.
    
    Generate the output object.`,
});


// Define and Export Flows

export async function initializeAether(input: InitializeAetherInput): Promise<AetherWorldState> {
    const { output } = await initializeAetherPrompt(input);
    if (!output) throw new Error("Failed to initialize Aether world.");
    return output;
}

export async function runAgentTurn(input: RunAgentTurnInput): Promise<AgentTurnOutput> {
    const { output } = await agentTurnPrompt(input);
    if (!output) throw new Error("Agent failed to generate a turn.");
    return output;
}

export async function runSupervisorTurn(input: RunSupervisorTurnInput): Promise<SupervisorTurnOutput> {
    const { output } = await supervisorTurnPrompt(input);
    if (!output) throw new Error("Supervisor failed to generate a turn.");
    return output;
}

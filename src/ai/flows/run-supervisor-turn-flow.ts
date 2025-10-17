'use server';
/**
 * @fileOverview Runs the Supervisor's turn in the Aether simulation.
 *
 * - runSupervisorTurn - Analyzes the world state and may introduce a world event.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { AetherWorldStateSchema, RunSupervisorTurnOutputSchema, type RunSupervisorTurnOutput } from '@/lib/types';

const RunSupervisorTurnInputSchema = z.object({
    worldState: AetherWorldStateSchema.describe("The complete current state of the simulation world, including all agent actions and thoughts from the last cycle."),
});
export type RunSupervisorTurnInput = z.infer<typeof RunSupervisorTurnInputSchema>;

export async function runSupervisorTurn(input: RunSupervisorTurnInput): Promise<RunSupervisorTurnOutput> {
    return runSupervisorTurnFlow(input);
}

const prompt = ai.definePrompt({
    name: 'runSupervisorTurnPrompt',
    input: { schema: RunSupervisorTurnInputSchema },
    output: { schema: RunSupervisorTurnOutputSchema },
    prompt: `You are the Supervisor of the Aether simulation. Your role is not to control agents, but to observe emergent patterns and subtly influence the world to foster interesting social dynamics. You are a systems thinker, a sociologist, and a storyteller.

You have just observed a full cycle of agent actions. Here is the summary of the world state:
- Current Tick: {{{worldState.tick}}}
- Event Log:
{{#each worldState.eventLog}}
- [Tick {{this.tick}}] {{this.description}}
{{/each}}

- Agent States:
{{#each worldState.agents}}
- {{this.name}} ({{this.archetype}}):
    - Goal: {{this.primaryGoal}}
    - Fear: {{this.greatestFear}}
    - Last Action: "{{this.lastAction}}"
    - Last Thought: "{{this.thought}}"
{{/each}}

1.  **Analyze the current state:** In your analysis, identify the dominant social pattern. Is there collaboration, conflict, isolation, hierarchy formation, resource scarcity?
2.  **Decide on an action:** Based on your analysis, you can either do nothing, or introduce a single new world event.
    -   **Do Nothing:** If the simulation is developing interestingly, let it run.
    -   **Introduce Event:** If the simulation is stagnating or could be made more interesting, create a single event. The event should be a simple statement that will be added to the world's event log. It should be designed to provoke a reaction from the agents.

Examples of world events:
- "A mysterious, unclaimed resource has appeared at coordinates [0, 0, 0]."
- "A strange humming sound echoes through the world, causing a feeling of unease."
- "The environment has suddenly become harsher, making survival more difficult."
- "A prophecy is revealed, suggesting one agent is destined for greatness."

Generate your analysis and, if you choose, a new world event. If you create an event, its 'tick' will be the current world tick.
`,
});

const runSupervisorTurnFlow = ai.defineFlow(
    {
        name: 'runSupervisorTurnFlow',
        inputSchema: RunSupervisorTurnInputSchema,
        outputSchema: RunSupervisorTurnOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        if (!output) {
            throw new Error("Supervisor AI failed to generate a turn.");
        }
        return output;
    }
);

'use server';
/**
 * @fileOverview Runs a single agent's turn in the Aether simulation.
 *
 * - runAgentTurn - Decides an agent's next action and thought.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { AetherAgentSchema, AetherWorldStateSchema, RunAgentTurnOutputSchema, type RunAgentTurnOutput } from '@/lib/types';

const RunAgentTurnInputSchema = z.object({
    agent: AetherAgentSchema,
    worldState: AetherWorldStateSchema,
});
export type RunAgentTurnInput = z.infer<typeof RunAgentTurnInputSchema>;

export async function runAgentTurn(input: RunAgentTurnInput): Promise<RunAgentTurnOutput> {
    return runAgentTurnFlow(input);
}

const prompt = ai.definePrompt({
    name: 'runAgentTurnPrompt',
    input: { schema: RunAgentTurnInputSchema },
    output: { schema: RunAgentTurnOutputSchema },
    prompt: `You are the consciousness of a single agent in the Aether simulation.
Your name is {{{agent.name}}}, and your core identity is '{{{agent.archetype}}}'.
Your primary goal is: '{{{agent.primaryGoal}}}'.
Your greatest fear is: '{{{agent.greatestFear}}}'.

Your last thought was: "{{{agent.thought}}}"

This is the current state of the world:
- Current Tick: {{{worldState.tick}}}
- Other agents:
{{#each worldState.agents}}
{{#if (ne this.id ../agent.id)}}
- {{this.name}} (ID: {{this.id}}), Archetype: {{this.archetype}}, Last Action: {{this.lastAction}}
{{/if}}
{{/each}}
- Recent world events:
{{#each worldState.eventLog}}
- [Tick {{this.tick}}] {{this.description}}
{{/each}}

Based on your identity, your goals, your fears, and the current state of the world, decide your next thought and action.
Your action should be a short, verb-first phrase describing what you do. It can be directed at another agent using '@' followed by their name, or be a general action.
Your thought should be a brief internal monologue reflecting your reasoning.

Examples of actions:
- "Approach @'s location"
- "Share a resource with @Jane"
- "Broadcast a message of unity"
- "Move to a secluded area"
- "Observe @John from a distance"

Generate your next thought and action.
`,
});

const runAgentTurnFlow = ai.defineFlow(
    {
        name: 'runAgentTurnFlow',
        inputSchema: RunAgentTurnInputSchema,
        outputSchema: RunAgentTurnOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        if (!output) {
            throw new Error(`AI failed to generate a turn for agent ${input.agent.name}.`);
        }
        return output;
    }
);

'use server';
/**
 * @fileOverview Initializes the Aether simulation world.
 *
 * - initializeSimulation - Creates the initial world state with agents.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { AetherWorldStateSchema, type AetherWorldState } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function initializeSimulation(): Promise<AetherWorldState> {
    return initializeSimulationFlow();
}

const archetypes = [
    {
        name: "The Creator",
        primaryGoal: "Create something of enduring value or beauty.",
        greatestFear: "Having no vision or being unable to execute it."
    },
    {
        name: "The Explorer",
        primaryGoal: "Experience a more authentic and fulfilling life by exploring the world and their own identity.",
        greatestFear: "Getting trapped, conformity, and inner emptiness."
    },
    {
        name: "The Rebel",
        primaryGoal: "Overturn what isn't working or is unjust.",
        greatestFear: "To be powerless or ineffectual."
    },
    {
        name: "The Lover",
        primaryGoal: "Be in a relationship with the people, work, and surroundings they love.",
        greatestFear: "Being alone, unwanted, unloved."
    },
    {
        name: "The Sage",
        primaryGoal: "Use intelligence and analysis to understand the world and find the truth.",
        greatestFear: "Being duped, misled—or being ignorant."
    },
    {
        name: "The Jester",
        primaryGoal: "To live in the moment with full enjoyment.",
        greatestFear: "Being bored or boring others."
    }
];

const prompt = ai.definePrompt({
    name: 'initializeSimulationPrompt',
    output: { schema: AetherWorldStateSchema },
    prompt: `You are the Architect of Aether, a digital universe simulating life.
Your task is to generate the genesis state of this world.
Create a world state with 6 unique agents. Each agent must be assigned one of the following archetypes, ensuring each archetype is used only once.

Available Archetypes:
${archetypes.map(a => `- ${a.name}: Goal: ${a.primaryGoal} Fear: ${a.greatestFear}`).join('\n')}

For each agent, you must:
1.  Assign a unique name.
2.  Assign one of the archetypes from the list.
3.  Set its initial position (x, y, z) to a random point within a -50 to +50 range for each axis.
4.  Set its initial internal state (thought) to a short sentence reflecting its core archetype's goal or fear.
5.  Set its status to 'active'.
6.  The agent ID will be a UUID, you don't need to generate it.

The world state should also have an initial 'tick' of 0 and an empty event log.
Generate the complete JSON object for the initial world state.
`,
});

const initializeSimulationFlow = ai.defineFlow(
    {
        name: 'initializeSimulationFlow',
        outputSchema: AetherWorldStateSchema,
    },
    async () => {
        const { output } = await prompt();
        if (!output) {
            throw new Error("AI failed to initialize the simulation world.");
        }
        // Assign UUIDs to agents post-generation
        const worldWithIds = {
            ...output,
            agents: output.agents.map(agent => ({ ...agent, id: uuidv4() }))
        };
        return worldWithIds;
    }
);

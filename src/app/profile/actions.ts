'use server';

import { generateUserProfile } from '@/ai/flows/generate-user-profile';
import type { ProfileData } from '@/lib/types';


export async function generateProfileOnServer(
    fullChatHistory: string, 
    previousProfilesContext: string
): Promise<{ success: boolean, profile?: ProfileData, error?: string }> {
    try {
        if (!fullChatHistory.trim()) {
            return { success: false, error: 'Tus conversaciones están vacías. No se puede generar un perfil.' };
        }

        const profile = await generateUserProfile({ fullChatHistory, previousProfilesContext });

        return { success: true, profile };

    } catch (e: any) {
        console.error("Error en generateProfileOnServer:", e);
        return { success: false, error: e.message || 'Ocurrió un error desconocido en el servidor.' };
    }
}

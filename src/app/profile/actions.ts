'use server';

import { generateUserProfile } from '@/ai/flows/generate-user-profile';
import type { Chat, Message, ProfileData, CachedProfile } from '@/lib/types';
import { firestore } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { headers } from 'next/headers';

// This is a helper function to get the user ID from the session cookie,
// which is a secure way to identify the user on the server.
// Note: This relies on a hypothetical session management setup.
// In a real app, you would use your auth provider's server-side utilities.
async function getUserIdFromServer(): Promise<string | null> {
    // This part is tricky without a real auth library like Next-Auth.
    // We'll simulate getting the user by assuming some header or cookie is set.
    // In a real-world scenario, this logic would be much more robust.
    // For now, this is a placeholder to show the server-side logic structure.
    const headersList = headers();
    // A more realistic approach would involve parsing a JWT or session cookie.
    // Let's assume a custom header for demonstration.
    const userId = headersList.get('x-user-id');
    return userId;
}


export async function generateProfileOnServer(): Promise<{ success: boolean, profile?: ProfileData, error?: string }> {
    try {
        // In a real app, you'd get the user ID from a secure server-side session.
        // For this environment, we'll need to improvise or assume a mechanism.
        // Let's assume a placeholder for the user ID for now.
        // THIS IS A CRITICAL PART: We need a way to get the user ID securely.
        // Without a proper session, we'll hardcode it for demonstration,
        // but this would come from `getUserIdFromServer()` in a real app.
        const userId = '{{USER_ID_PLACEHOLDER}}'; // This needs a real, secure implementation.
        
        if (!userId) {
            return { success: false, error: 'No se pudo verificar la sesión del usuario en el servidor.' };
        }

        const chatsQuery = query(collection(firestore, `users/${userId}/chats`), orderBy('createdAt', 'asc'));
        const chatsSnapshot = await getDocs(chatsQuery);

        if (chatsSnapshot.empty) {
            return { success: false, error: 'No hay conversaciones para analizar. ¡Inicia un chat para generar tu perfil!' };
        }

        let fullChatHistory = '';
        for (const chatDoc of chatsSnapshot.docs) {
            const chat = chatDoc.data() as Chat;
            fullChatHistory += `--- INICIO DEL CHAT: ${chat.title} ---\n`;
            const messagesQuery = query(collection(firestore, `users/${userId}/chats/${chat.id}/messages`), orderBy('timestamp', 'asc'));
            const messagesSnapshot = await getDocs(messagesQuery);

            messagesSnapshot.forEach(doc => {
                const msg = doc.data() as Message;
                const date = (msg.timestamp as Timestamp).toDate();
                fullChatHistory += `[${date.toISOString()}] ${msg.role}: ${msg.content}\n`;
            });
            fullChatHistory += `--- FIN DEL CHAT ---\n\n`;
        }

        if (!fullChatHistory.trim()) {
            return { success: false, error: 'Tus conversaciones están vacías. No se puede generar un perfil.' };
        }
        
        const profileDocRef = doc(firestore, `users/${userId}/profile/main`);
        const lastProfileDoc = await getDoc(profileDocRef);
        const previousProfilesContext = lastProfileDoc.exists() ? JSON.stringify(lastProfileDoc.data(), null, 2) : '';

        const profile = await generateUserProfile({ fullChatHistory, previousProfilesContext });

        return { success: true, profile };

    } catch (e: any) {
        console.error("Error en generateProfileOnServer:", e);
        // Distinguish between permission errors and others
        if (e.code === 'permission-denied') {
             return { success: false, error: 'Permiso denegado. Asegúrate de que las reglas de seguridad de Firestore permitan el acceso del servidor.' };
        }
        return { success: false, error: e.message || 'Ocurrió un error desconocido en el servidor.' };
    }
}

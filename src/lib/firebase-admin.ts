
import * as admin from 'firebase-admin';

let adminApp: admin.app.App | undefined;

function initializeAdminApp() {
    // Prevent re-initialization
    if (admin.apps.length > 0) {
        return admin.app();
    }

    // Load service account from environment variables
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

    if (!serviceAccountBase64) {
        console.error('La variable de entorno FIREBASE_SERVICE_ACCOUNT_BASE64 no está configurada.');
        // Return undefined or throw an error, depending on how you want to handle missing config
        return undefined;
    }

    try {
        const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
        const serviceAccount = JSON.parse(serviceAccountJson);

        // Initialize the app with the service account
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            // Add your storage bucket URL here if not automatically detected
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'studio-3422235219-dd152.appspot.com',
        });
    } catch (error) {
        console.error('Error al inicializar Firebase Admin SDK:', error);
        return undefined;
    }
}

export function getAdminApp() {
    if (!adminApp) {
        adminApp = initializeAdminApp();
    }
    return adminApp;
}

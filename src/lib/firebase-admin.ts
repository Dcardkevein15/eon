import * as admin from 'firebase-admin';

let adminApp: admin.app.App | undefined;

function initializeAdminApp() {
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

    if (!serviceAccountBase64) {
        console.error('La variable de entorno FIREBASE_SERVICE_ACCOUNT_BASE64 no está configurada.');
        return undefined;
    }

    try {
        const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
        const serviceAccount = JSON.parse(serviceAccountJson);

        if (admin.apps.length > 0) {
            return admin.app();
        }

        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
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

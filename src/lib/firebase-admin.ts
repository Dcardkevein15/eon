import * as admin from 'firebase-admin';

let adminApp: admin.app.App | undefined;

function initializeAdminApp(): admin.app.App | undefined {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!serviceAccountBase64) {
    console.warn(
      'La variable de entorno FIREBASE_SERVICE_ACCOUNT_BASE64 no está configurada. Las funciones de administrador de Firebase no estarán disponibles.'
    );
    return undefined;
  }

  try {
    const decodedServiceAccount = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(decodedServiceAccount);

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Error al inicializar Firebase Admin SDK:', error.message);
    return undefined;
  }
}

/**
 * Gets the existing or a new Firebase Admin App instance.
 */
export function getAdminApp(): admin.app.App | undefined {
  if (!adminApp) {
    adminApp = initializeAdminApp();
  }
  return adminApp;
}

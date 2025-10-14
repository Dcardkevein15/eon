import * as admin from 'firebase-admin';

let adminApp: admin.app.App | undefined;

export function getAdminApp(): admin.app.App | undefined {
  if (adminApp) {
    return adminApp;
  }
  
  if (admin.apps.length > 0) {
    adminApp = admin.app();
    return adminApp;
  }

  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!serviceAccountBase64) {
    console.error(
      'La variable de entorno FIREBASE_SERVICE_ACCOUNT_BASE64 no está configurada.'
    );
    return undefined;
  }

  try {
    const decodedServiceAccount = Buffer.from(
      serviceAccountBase64,
      'base64'
    ).toString('utf-8');
    const serviceAccount = JSON.parse(decodedServiceAccount);

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    return adminApp;

  } catch (error: any) {
    console.error('Error al inicializar Firebase Admin SDK:', error.message);
    return undefined;
  }
}

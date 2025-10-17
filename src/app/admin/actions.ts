'use server';

import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { firestore } from '@/lib/firebase';
import type { Therapist, User } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function approveApplication(application: any): Promise<{ success: boolean; message: string }> {
  const adminApp = getAdminApp();
  if (!adminApp) {
    return { success: false, message: 'Error de configuración del servidor.' };
  }
  
  const auth = adminApp.auth();

  try {
    // 1. Update user's custom claims to add 'professional' role
    const currentClaims = (await auth.getUser(application.userId)).customClaims || {};
    await auth.setCustomUserClaims(application.userId, { ...currentClaims, roles: ['professional'] });

    // 2. Create the public therapist profile
    const therapistProfile: Omit<Therapist, 'id' | 'rating' | 'reviewsCount'> = {
      userId: application.userId,
      name: application.applicationData.name,
      photoUrl: application.applicationData.photoUrl || `https://i.pravatar.cc/150?u=${application.userId}`,
      specialties: application.applicationData.specialties,
      pricePerSession: application.applicationData.pricePerSession,
      languages: application.applicationData.languages,
      email: application.applicationData.email,
      whatsapp: application.applicationData.whatsapp,
      verified: true,
      published: true, // Professionals are published by default on approval
      credentials: application.applicationData.credentials,
      bio: application.applicationData.bio,
    };
    // The therapist ID will be the same as the user ID for simplicity
    const therapistRef = doc(firestore, 'therapists', application.userId);
    await setDoc(therapistRef, { ...therapistProfile, rating: 0, reviewsCount: 0 });
    
    // 3. Update the user document to include the therapistId
    const userRef = doc(firestore, 'users', application.userId);
    await updateDoc(userRef, { therapistId: application.userId });

    // 4. Update the application status
    const applicationRef = doc(firestore, 'therapistApplications', application.id);
    await updateDoc(applicationRef, { status: 'approved' });

    revalidatePath('/marketplace');
    revalidatePath('/admin'); // Revalidate admin pages if they exist

    return { success: true, message: 'Solicitud aprobada y perfil de terapeuta creado.' };
  } catch (error) {
    console.error("Error approving application: ", error);
    return { success: false, message: 'Ocurrió un error al aprobar la solicitud.' };
  }
}

export async function rejectApplication(applicationId: string): Promise<{ success: boolean; message: string }> {
  try {
    const applicationRef = doc(firestore, 'therapistApplications', applicationId);
    await updateDoc(applicationRef, { status: 'rejected' });
    revalidatePath('/marketplace');
    revalidatePath('/admin');
    return { success: true, message: 'Solicitud rechazada.' };
  } catch (error) {
    console.error("Error rejecting application: ", error);
    return { success: false, message: 'Ocurrió un error al rechazar la solicitud.' };
  }
}

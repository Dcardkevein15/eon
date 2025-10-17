'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { User } from 'firebase/auth';
import { useFirestore, useStorage } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { TherapistApplicationDataSchema, type TherapistApplicationData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

interface ApplicationFormProps {
  user: User;
}

type FileUploadState = 'idle' | 'uploading' | 'success' | 'error';

const FileUploadButton = ({ id, onFileSelect, state, disabled }: { id: string, onFileSelect: (file: File) => void, state: FileUploadState, disabled: boolean }) => {
    const [fileName, setFileName] = useState('');
    const Icon = state === 'uploading' ? Loader2 : state === 'success' ? FileCheck : state === 'error' ? AlertTriangle : Upload;
    const iconColor = state === 'success' ? 'text-green-500' : state ==='error' ? 'text-red-500' : '';

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setFileName(file.name);
            onFileSelect(file);
        }
    }
    return (
        <>
            <input type="file" id={id} className="hidden" onChange={handleFileChange} disabled={disabled}/>
            <Button type="button" variant="outline" onClick={() => document.getElementById(id)?.click()} className="w-full justify-start text-left" disabled={disabled}>
                <Icon className={cn("mr-2 h-4 w-4", state === 'uploading' && "animate-spin", iconColor)} />
                <span className="truncate flex-1">{fileName || 'Seleccionar archivo...'}</span>
            </Button>
        </>
    )
}

export default function ApplicationForm({ user }: ApplicationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [idUploadState, setIdUploadState] = useState<FileUploadState>('idle');
  const [licenseUploadState, setLicenseUploadState] = useState<FileUploadState>('idle');
  const [submissionComplete, setSubmissionComplete] = useState(false);

  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const { register, handleSubmit, trigger, getValues, formState: { errors } } = useForm<TherapistApplicationData>({
    resolver: zodResolver(TherapistApplicationDataSchema),
    defaultValues: {
      email: user.email || '',
    }
  });

  const nextStep = async () => {
    const fieldsToValidate = currentStep === 1 
      ? ['name', 'email', 'whatsapp', 'credentials', 'bio'] 
      : ['specialties', 'languages', 'pricePerSession'];
    
    const isValid = await trigger(fieldsToValidate as any);
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => setCurrentStep(prev => prev - 1);

  const uploadFile = async (file: File | null, path: string, stateSetter: React.Dispatch<React.SetStateAction<FileUploadState>>): Promise<string> => {
    if (!file) {
        stateSetter('error');
        throw new Error('Archivo no seleccionado.');
    }
    stateSetter('uploading');
    try {
        const fileRef = ref(storage, path);
        const snapshot = await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        stateSetter('success');
        return downloadURL;
    } catch (error) {
        console.error("File upload error:", error);
        stateSetter('error');
        throw new Error('No se pudo subir el archivo.');
    }
  };

  const onSubmit = async (data: TherapistApplicationData) => {
    setIsSubmitting(true);
    try {
        const identityDocumentUrl = await uploadFile(identityFile, `applications/${user.uid}/identity_doc_${identityFile?.name}`, setIdUploadState);
        const professionalLicenseUrl = await uploadFile(licenseFile, `applications/${user.uid}/license_doc_${licenseFile?.name}`, setLicenseUploadState);
        
        const applicationData = {
            ...data,
            specialties: data.specialties.toString().split(',').map(s => s.trim()).filter(Boolean),
            languages: data.languages.toString().split(',').map(l => l.trim()).filter(Boolean),
            identityDocumentUrl,
            professionalLicenseUrl,
            photoUrl: user.photoURL,
        }

        await addDoc(collection(firestore, 'therapistApplications'), {
            userId: user.uid,
            displayName: user.displayName,
            email: user.email, // Use a consistent email from auth
            status: 'pending',
            submittedAt: serverTimestamp(),
            applicationData,
        });

        toast({ title: '¡Éxito!', description: 'Tu solicitud ha sido enviada. Nos pondremos en contacto pronto.' });
        setSubmissionComplete(true);

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error al Enviar', description: error.message || 'No se pudo enviar la solicitud.' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (submissionComplete) {
      return (
          <div className="text-center py-12">
            <h3 className="text-2xl font-semibold text-primary">¡Gracias por tu interés!</h3>
            <p className="mt-2 text-muted-foreground">Hemos recibido tu solicitud y nuestro equipo la revisará pronto. Te notificaremos por correo electrónico sobre el estado de tu postulación.</p>
          </div>
      )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre Completo</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
              </div>
               <div className="grid sm:grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="email">Email de Contacto</Label>
                    <Input id="email" {...register('email')} />
                    {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
                 </div>
                 <div>
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input id="whatsapp" {...register('whatsapp')} placeholder="+57 300 123 4567" />
                    {errors.whatsapp && <p className="text-sm text-destructive mt-1">{errors.whatsapp.message}</p>}
                 </div>
               </div>
              <div>
                <Label htmlFor="credentials">Credenciales</Label>
                <Input id="credentials" {...register('credentials')} placeholder="Ej: Lic. en Psicología, Mat. 12345" />
                {errors.credentials && <p className="text-sm text-destructive mt-1">{errors.credentials.message}</p>}
              </div>
              <div>
                <Label htmlFor="bio">Biografía</Label>
                <Textarea id="bio" {...register('bio')} rows={5} placeholder="Cuéntanos sobre ti, tu enfoque y experiencia..." />
                {errors.bio && <p className="text-sm text-destructive mt-1">{errors.bio.message}</p>}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="specialties">Especialidades</Label>
                <Input id="specialties" {...register('specialties')} placeholder="Ansiedad, Depresión, Terapia de Pareja" />
                <p className="text-xs text-muted-foreground mt-1">Separa las especialidades por comas.</p>
                {errors.specialties && <p className="text-sm text-destructive mt-1">{errors.specialties.message}</p>}
              </div>
              <div>
                <Label htmlFor="languages">Idiomas</Label>
                <Input id="languages" {...register('languages')} placeholder="Español, Inglés" />
                 <p className="text-xs text-muted-foreground mt-1">Separa los idiomas por comas.</p>
                {errors.languages && <p className="text-sm text-destructive mt-1">{errors.languages.message}</p>}
              </div>
              <div>
                <Label htmlFor="pricePerSession">Precio por Sesión (USD)</Label>
                <Input id="pricePerSession" type="number" {...register('pricePerSession')} />
                {errors.pricePerSession && <p className="text-sm text-destructive mt-1">{errors.pricePerSession.message}</p>}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
               <div>
                  <h3 className="text-lg font-medium">Documentación</h3>
                  <p className="text-sm text-muted-foreground">Sube los siguientes documentos en formato PDF o imagen.</p>
               </div>
              <div className="space-y-4">
                 <div>
                    <Label>Documento de Identidad (Cédula o Pasaporte)</Label>
                    <FileUploadButton id="identity-file" onFileSelect={setIdentityFile} state={idUploadState} disabled={isSubmitting}/>
                 </div>
                 <div>
                    <Label>Licencia Profesional o Diploma</Label>
                    <FileUploadButton id="license-file" onFileSelect={setLicenseFile} state={licenseUploadState} disabled={isSubmitting}/>
                 </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between items-center pt-4">
        <div>
          {currentStep > 1 && (
            <Button type="button" variant="outline" onClick={prevStep} disabled={isSubmitting}>
              Anterior
            </Button>
          )}
        </div>
        <div>
          {currentStep < 3 && (
            <Button type="button" onClick={nextStep}>
              Siguiente
            </Button>
          )}
          {currentStep === 3 && (
            <Button type="submit" disabled={isSubmitting || !identityFile || !licenseFile}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

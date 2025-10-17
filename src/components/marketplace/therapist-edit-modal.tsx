'use client';

import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Therapist } from '@/lib/types';
import { useEffect, useState } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';

interface TherapistEditModalProps {
  therapist: Therapist | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Therapist) => void;
}

const getInitialData = (therapist: Therapist | null) => {
    const defaults = {
      id: '',
      userId: '',
      name: '',
      photoUrl: 'https://picsum.photos/seed/new-therapist/200/200',
      rating: 0,
      reviewsCount: 0,
      specialties: [],
      pricePerSession: 50,
      languages: [],
      email: '',
      whatsapp: '',
      verified: true,
      published: true,
      credentials: '',
      bio: '',
    };

    if (!therapist) return defaults;
    
    return {
        ...therapist,
        specialties: Array.isArray(therapist.specialties) ? therapist.specialties.join(', ') : '',
        languages: Array.isArray(therapist.languages) ? therapist.languages.join(', ') : '',
    }
}

export default function TherapistEditModal({
  therapist,
  isOpen,
  onClose,
  onSave,
}: TherapistEditModalProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: getInitialData(therapist),
  });

  const isPublished = watch('published');

  useEffect(() => {
    if (isOpen) {
      reset(getInitialData(therapist));
    }
  }, [therapist, isOpen, reset]);

  const onSubmit = async (data: any) => {
    setIsSaving(true);

    const therapistId = data.id || uuidv4();

    const processedData: Omit<Therapist, 'id'> = {
      ...data,
      specialties: String(data.specialties).split(',').map(s => s.trim()).filter(Boolean),
      languages: String(data.languages).split(',').map(l => l.trim()).filter(Boolean),
      pricePerSession: Number(data.pricePerSession),
      rating: data.id ? data.rating : 0, // Keep existing rating or default to 0
      reviewsCount: data.id ? data.reviewsCount : 0,
      userId: data.id ? data.userId : 'temp-userId', // Needs a real userId
    };

    try {
        const therapistRef = doc(firestore, 'therapists', therapistId);
        if (data.id) { // Existing therapist
             await updateDoc(therapistRef, processedData);
             toast({ title: "Éxito", description: "Perfil del terapeuta actualizado." });
        } else { // New therapist
            await setDoc(therapistRef, processedData);
            toast({ title: "Éxito", description: "Nuevo terapeuta agregado." });
        }
        onSave({ ...processedData, id: therapistId });
        onClose();
    } catch(error) {
        console.error("Error saving therapist:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el perfil." });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{therapist ? 'Editar Profesional' : 'Agregar Profesional'}</DialogTitle>
          <DialogDescription>
            {therapist
              ? 'Edita los detalles del perfil del terapeuta.'
              : 'Completa el formulario para agregar un nuevo terapeuta.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ScrollArea className="max-h-[60vh] p-1">
            <div className="grid gap-4 py-4 px-5">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nombre
                  </Label>
                  <Input id="name" {...register('name')} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="photoUrl" className="text-right">
                    URL de la Foto
                  </Label>
                  <Input id="photoUrl" {...register('photoUrl')} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">Email</Label>
                    <Input id="email" {...register('email')} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="whatsapp" className="text-right">WhatsApp</Label>
                    <Input id="whatsapp" {...register('whatsapp')} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="credentials" className="text-right">
                    Credenciales
                  </Label>
                  <Input id="credentials" {...register('credentials')} className="col-span-3" />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="specialties" className="text-right">
                    Especialidades
                  </Label>
                  <Input id="specialties" {...register('specialties' as any)} placeholder="Ansiedad, Depresión,..." className="col-span-3" />
                   <p className="col-span-3 col-start-2 text-xs text-muted-foreground">Valores separados por coma.</p>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="languages" className="text-right">
                    Idiomas
                  </Label>
                  <Input id="languages" {...register('languages' as any)} placeholder="Español, Inglés,..." className="col-span-3" />
                   <p className="col-span-3 col-start-2 text-xs text-muted-foreground">Valores separados por coma.</p>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="bio" className="text-right">
                    Biografía
                  </Label>
                  <Textarea id="bio" {...register('bio')} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="pricePerSession" className="text-right">
                    Precio/Sesión ($)
                  </Label>
                  <Input id="pricePerSession" type="number" {...register('pricePerSession', { valueAsNumber: true })} className="col-span-3" />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="publish" className="text-right">
                    Publicar Perfil
                  </Label>
                   <div className="col-span-3 flex items-center space-x-2">
                      <Switch id="publish" checked={isPublished} onCheckedChange={(checked) => setValue('published', checked)} />
                      <label htmlFor="publish" className="text-sm font-medium leading-none">
                        Hacer visible el perfil en el marketplace.
                      </label>
                    </div>
                </div>
              </div>
          </ScrollArea>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import type { Therapist } from '@/lib/types';
import { useEffect } from 'react';
import { ScrollArea } from '../ui/scroll-area';

interface TherapistEditModalProps {
  therapist: Therapist | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Therapist) => void;
}

// Helper to safely convert a value to an array of strings
const toArray = (value: string | string[] | undefined): string[] => {
  if (Array.isArray(value)) return value.map(s => s.trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim() !== '') {
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};


export default function TherapistEditModal({
  therapist,
  isOpen,
  onClose,
  onSave,
}: TherapistEditModalProps) {
  const { register, handleSubmit, reset, watch } = useForm<Therapist>({
    defaultValues: therapist || {
      id: '',
      name: '',
      photoUrl: '',
      rating: 0,
      reviewsCount: 0,
      specialties: [],
      pricePerSession: 0,
      languages: [],
      verified: false,
      credentials: '',
      bio: '',
    },
  });

  const isVerified = watch('verified');

  useEffect(() => {
    if (isOpen) {
      reset(therapist || {
        id: '',
        name: '',
        photoUrl: '',
        rating: 0,
        reviewsCount: 0,
        specialties: [],
        pricePerSession: 0,
        languages: [],
        verified: false,
        credentials: '',
        bio: '',
      });
    }
  }, [therapist, isOpen, reset]);

  const onSubmit = (data: any) => {
    // Convert comma-separated strings back to arrays before saving
    const processedData = {
      ...data,
      specialties: toArray(data.specialties),
      languages: toArray(data.languages),
    };
    onSave(processedData);
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
                {/* Basic Info */}
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
                  <Label htmlFor="credentials" className="text-right">
                    Credenciales
                  </Label>
                  <Input id="credentials" {...register('credentials')} className="col-span-3" />
                </div>
                
                {/* Details */}
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

                {/* Admin-only Fields */}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Verificado (KYC)</Label>
                    <div className="col-span-3 flex items-center space-x-2">
                        <Checkbox id="verified" checked={isVerified} disabled />
                        <label htmlFor="verified" className="text-sm font-medium leading-none text-muted-foreground">
                            El estado de verificación es de solo lectura.
                        </label>
                    </div>
                </div>
                {/* In a real app, you'd have a file upload component for KYC */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="kyc" className="text-right">
                    Docs. KYC
                  </Label>
                  <Input id="kyc" type="file" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="publish" className="text-right">
                    Publicar Perfil
                  </Label>
                   <div className="col-span-3 flex items-center space-x-2">
                      <Switch id="publish" />
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
            <Button type="submit">Guardar Cambios</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useAuth } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { LogIn, LogOut, User, Camera, Loader2, Moon, Sun, Briefcase, Route } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useStorage } from '@/firebase/storage';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useTour } from '@/hooks/use-interactive-tour';

export default function UserButton() {
  const { user, loading, signInWithGoogle, signOut, auth, userRoles } = useAuth();
  const storage = useStorage();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();
  const { startTour } = useTour();
  
  const [isClient, setIsClient] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [photoURL, setPhotoURL] = useState(user?.photoURL ?? '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (user?.photoURL) {
      setPhotoURL(user.photoURL);
    }
  }, [user?.photoURL]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !storage) return;

    setIsUploading(true);

    const storageRef = ref(storage, `profile-pictures/${user.uid}/${file.name}`);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: downloadURL });
      }
      
      setPhotoURL(downloadURL);

      toast({
        title: '¡Éxito!',
        description: 'Tu foto de perfil se ha actualizado.',
      });

    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo subir la imagen. Inténtalo de nuevo.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const isProfessional = userRoles.includes('professional');
  const isAdmin = userRoles.includes('admin');


  if (!isClient || loading) {
    return (
      <div className="flex items-center gap-2 p-2">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Button onClick={signInWithGoogle} className="w-full">
        <LogIn className="mr-2 h-4 w-4" />
        Iniciar sesión con Google
      </Button>
    );
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        disabled={isUploading}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-start text-left h-auto py-2 px-2">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={photoURL ?? ''} alt={user?.displayName ?? ''} />
                <AvatarFallback>
                  <User />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">{user?.displayName ?? 'Usuario'}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.email ?? 'Invitado'}</span>
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user?.displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
           <DropdownMenuItem onClick={startTour}>
            <Route className="mr-2 h-4 w-4" />
            <span>Iniciar Tour Guiado</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            <span>Cambiar a modo {theme === 'dark' ? 'claro' : 'oscuro'}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleUploadClick} disabled={isUploading}>
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-2 h-4 w-4" />
            )}
            <span>{isUploading ? 'Subiendo...' : 'Cambiar foto'}</span>
          </DropdownMenuItem>
          {!isProfessional && !isAdmin && (
             <DropdownMenuItem asChild>
                <Link href="/apply">
                  <Briefcase className="mr-2 h-4 w-4" />
                  <span>Conviértete en Profesional</span>
                </Link>
              </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

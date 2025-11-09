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
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { LogIn, LogOut, User, Camera, Loader2, Moon, Sun, Briefcase, Route, UserCircle, Dumbbell, Star, BookOpen, Atom, BarChartHorizontal, BookOpen as TorahIcon } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useStorage } from '@/firebase/storage';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import Link from 'next/link';

const navItems = [
    { href: "/aether", icon: Atom, label: "Aether" },
    { href: "/profile", icon: UserCircle, label: "Perfil Psicológico" },
    { href: "/gym", icon: Dumbbell, label: "Gimnasio Emocional" },
    { href: "/dreams", icon: Star, label: "Portal de Sueños" },
    { href: "/blog", icon: BookOpen, label: "Blog" },
    { href: "/marketplace", icon: Briefcase, label: "Marketplace" },
    { href: "/trading", icon: BarChartHorizontal, label: "Análisis Pro" },
    { href: "/torah-code", icon: TorahIcon, label: "Oráculo de la Torá" },
];


export default function UserButton() {
  const { user, loading, signInWithGoogle, signOut, auth, userRoles } = useAuth();
  const storage = useStorage();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();
  
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
      </div>
    );
  }

  if (!user) {
    return (
      <Button onClick={signInWithGoogle} variant="outline">
        <LogIn className="mr-2 h-4 w-4" />
        Iniciar sesión
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
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={photoURL ?? ''} alt={user?.displayName ?? ''} />
              <AvatarFallback>
                <User />
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user?.displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
           <DropdownMenuGroup>
             <DropdownMenuLabel className="text-xs">Navegación</DropdownMenuLabel>
             {navItems.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>
                        <item.icon className="mr-2 h-4 w-4"/>
                        <span>{item.label}</span>
                    </Link>
                </DropdownMenuItem>
             ))}
           </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs">Ajustes</DropdownMenuLabel>
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
          </DropdownMenuGroup>
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

'use client';

import { useAuth } from '@/components/providers';
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
import { LogIn, LogOut, User } from 'lucide-react';

export default function UserButton() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return <Skeleton className="h-10 w-full" />;
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start text-left h-auto py-2 px-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.photoURL ?? ''} alt={user?.displayName ?? ''} />
              <AvatarFallback>
                <User />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
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
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

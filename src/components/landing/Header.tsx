'use client';
import { AppLogo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const Header = () => {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center mx-auto px-4">
                <div className="mr-4 flex items-center">
                    <AppLogo className="h-6 w-6 mr-2" />
                    <span className="font-bold">NimbusChat</span>
                </div>
                <nav className="flex items-center space-x-6 text-sm font-medium">
                    <Link href="#features" className="transition-colors hover:text-foreground/80 text-foreground/60">Características</Link>
                </nav>
                <div className="flex flex-1 items-center justify-end space-x-4">
                    <Button asChild>
                        <Link href="/c">Entrar a la App</Link>
                    </Button>
                </div>
            </div>
        </header>
    )
}

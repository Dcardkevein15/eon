'use client';
import { AppLogo } from '@/components/logo';

export const Footer = () => {
    return (
        <footer className="border-t border-border/50">
            <div className="container mx-auto px-4 py-8 flex justify-between items-center text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <AppLogo className="w-5 h-5" />
                    <p>&copy; {new Date().getFullYear()} NimbusChat. Todos los derechos reservados.</p>
                </div>
                <div className="flex gap-4">
                    <a href="#" className="hover:text-foreground">Términos</a>
                    <a href="#" className="hover:text-foreground">Privacidad</a>
                </div>
            </div>
        </footer>
    )
}

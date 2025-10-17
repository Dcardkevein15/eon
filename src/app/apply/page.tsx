'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/firebase';
import ApplicationForm from '@/components/apply/application-form';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Mission, Process, Requirements } from '@/components/apply/info-cards';

export default function ApplyPage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <Button asChild variant="ghost" className="-ml-4 text-muted-foreground hover:bg-accent/10 hover:text-foreground">
            <Link href="/">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Volver al Inicio
            </Link>
          </Button>
          <div className="mt-4 text-center">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-chart-5 via-chart-1 to-chart-2">
              Únete a Nuestra Misión
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Buscamos profesionales de la salud mental apasionados por hacer accesible el bienestar emocional a través de la tecnología.
            </p>
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Mission />
          <Requirements />
          <Process />
        </div>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Formulario de Postulación</CardTitle>
            <CardDescription>
              Completa la siguiente información. Nuestro equipo la revisará y se pondrá en contacto contigo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Cargando...</p>
            ) : user ? (
              <ApplicationForm user={user} />
            ) : (
              <Alert>
                <AlertTitle>Inicia Sesión para Postular</AlertTitle>
                <AlertDescription>
                  Debes iniciar sesión con tu cuenta de Google para poder enviar tu solicitud.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

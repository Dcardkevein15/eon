'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, ShieldCheck, ListChecks } from 'lucide-react';

export function Mission() {
  return (
    <Card className="bg-card/30 border-transparent">
      <CardHeader className="flex flex-row items-center gap-4 space-y-0">
        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
          <Target className="w-6 h-6 text-primary" />
        </div>
        <CardTitle>Nuestra Misión</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Democratizar el acceso a herramientas de bienestar emocional, creando un espacio seguro y profesional para el crecimiento personal.
        </p>
      </CardContent>
    </Card>
  );
}

export function Requirements() {
  return (
    <Card className="bg-card/30 border-transparent">
      <CardHeader className="flex flex-row items-center gap-4 space-y-0">
        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <CardTitle>Requisitos</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
          <li>Título en Psicología o campo relacionado.</li>
          <li>Licencia profesional vigente.</li>
          <li>Mínimo 2 años de experiencia clínica.</li>
          <li>Pasión por la tecnología y la innovación.</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function Process() {
  return (
    <Card className="bg-card/30 border-transparent">
      <CardHeader className="flex flex-row items-center gap-4 space-y-0">
         <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
          <ListChecks className="w-6 h-6 text-primary" />
        </div>
        <CardTitle>Proceso</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start"><span className="font-bold mr-2">1.</span> Envía tu postulación online.</li>
          <li className="flex items-start"><span className="font-bold mr-2">2.</span> Nuestro equipo revisa tus credenciales.</li>
          <li className="flex items-start"><span className="font-bold mr-2">3.</span> Entrevista virtual con nuestro equipo.</li>
          <li className="flex items-start"><span className="font-bold mr-2">4.</span> ¡Bienvenido/a a la plataforma!</li>
        </ol>
      </CardContent>
    </Card>
  );
}

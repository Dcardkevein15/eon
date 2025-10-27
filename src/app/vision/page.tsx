'use client';

import { useRef } from 'react';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, User, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useVisionSession } from '@/hooks/useVisionSession';
import AIVisualizer from '@/components/vision/AIVisualizer';


export default function VisionPage() {
  const { user, loading: authLoading } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const {
    isSessionActive,
    aiState,
    startSession,
    stopSession,
    permissionStatus,
    transcript
  } = useVisionSession({ videoRef });


  if (authLoading) {
     return (
      <div className="h-screen w-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Autenticando...</p>
      </div>
    );
  }
  

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col items-center justify-center p-4 relative">
       <Button asChild variant="ghost" className="absolute top-4 left-4 text-muted-foreground hover:text-foreground z-20">
          <Link href="/">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Volver al Inicio
          </Link>
       </Button>

      {permissionStatus === 'denied' && (
        <Card className="max-w-md text-center bg-card/50">
          <CardHeader><CardTitle>Permisos Necesarios</CardTitle></CardHeader>
          <CardContent>
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Para iniciar una sesión de visión, necesitamos acceso a tu cámara y micrófono.</p>
            <Button onClick={startSession}>Reintentar Permisos</Button>
          </CardContent>
        </Card>
      )}

      {!isSessionActive && permissionStatus !== 'denied' && (
        <div className="text-center z-10">
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground">Visión IA</h1>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">Inicia una conversación cara a cara con tu asistente, que podrá verte y escucharte en tiempo real.</p>
            <Button onClick={startSession} size="lg" disabled={authLoading}>
              {permissionStatus === 'prompt' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Iniciar Sesión de Visión
            </Button>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {isSessionActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex flex-col items-center justify-between"
          >
            <div className="w-full max-w-4xl text-center pt-16">
              <p className="text-xl sm:text-2xl text-muted-foreground h-16 transition-opacity duration-300">
                {transcript || '...'}
              </p>
            </div>
            
            <div className="flex flex-col items-center">
              <AIVisualizer state={aiState} />
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="relative w-48 h-36 rounded-xl overflow-hidden border-2 border-primary shadow-lg">
                  <video ref={videoRef} autoPlay muted className="w-full h-full object-cover transform scaleX(-1)" />
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 p-1 rounded-md">
                      <User className="w-4 h-4"/>
                      <p className="text-xs font-bold">{user?.displayName?.split(' ')[0]}</p>
                  </div>
              </div>
               <Button onClick={stopSession} variant="destructive">
                  Finalizar Sesión
               </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

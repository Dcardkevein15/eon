
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Mic, Settings, WifiOff, Bot, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { aetherAction } from '@/ai/flows/aether-flows';
import { generateSpeech } from '@/ai/flows/speech';
import { AnimatePresence, motion } from 'framer-motion';

// --- TYPES ---
type AetherStatus = 'initializing' | 'idle' | 'listening' | 'processing' | 'speaking';
type TranscriptEntry = {
  id: string;
  speaker: 'user' | 'ai';
  text: string;
};

// --- CONSTANTS ---
const VAD_THRESHOLD = 0.1; // Voice Activity Detection sensitivity
const SILENCE_DURATION_MS = 1500; // Time of silence to trigger processing
const FRAME_CAPTURE_INTERVAL_MS = 500; // How often to capture video frames

// --- MAIN COMPONENT ---
export default function AetherPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- State ---
  const [status, setStatus] = useState<AetherStatus>('initializing');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [latestVideoFrame, setLatestVideoFrame] = useState<string | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);

  // --- Permission and Stream Handling ---
  useEffect(() => {
    const getPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermissions(true);
        setStatus('idle');
      } catch (error) {
        console.error('Error accessing media devices:', error);
        setHasPermissions(false);
        setStatus('idle');
        toast({
          variant: 'destructive',
          title: 'Acceso a Medios Denegado',
          description: 'Por favor, habilita los permisos de cámara y micrófono en tu navegador.',
        });
      }
    };

    getPermissions();

    // Cleanup function to stop media tracks when the component unmounts
    return () => {
        streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [toast]);


  // --- Core Processing Logic ---
  const processAudioChunk = useCallback(async (audioBlob: Blob) => {
    if (!latestVideoFrame) {
      toast({ variant: 'destructive', title: 'Error de Captura', description: 'No se pudo capturar un fotograma de video.' });
      return;
    }
    setStatus('processing');
    
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const audioDataUri = reader.result as string;
      const conversationHistory = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');

      try {
        // 1. Get text response from Aether flow
        const { responseText } = await aetherAction({
          audioDataUri,
          videoFrameDataUri: latestVideoFrame,
          conversationHistory,
        });

        addTranscriptEntry('ai', responseText);
        
        // 2. Generate speech from the text
        setStatus('speaking');
        const { media } = await generateSpeech(responseText);
        
        // 3. Play the speech
        if (audioPlayerRef.current) {
          audioPlayerRef.current.src = media;
          audioPlayerRef.current.play();
          audioPlayerRef.current.onended = () => {
            setStatus('idle'); // Back to idle after speaking is finished
          };
        }

      } catch (error) {
        console.error('Error processing Aether stream:', error);
        toast({ variant: 'destructive', title: 'Error de IA', description: 'No se pudo procesar la respuesta.' });
        setStatus('idle');
      }
    };
  }, [latestVideoFrame, toast, transcript]);

  // --- VAD and Recording Logic ---
  const startListening = useCallback(() => {
    if (!streamRef.current || status !== 'idle') return;
    
    mediaRecorderRef.current = new MediaRecorder(streamRef.current, { mimeType: 'audio/webm' });
    const audioChunks: Blob[] = [];

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorderRef.current.onstop = () => {
      if (audioChunks.length > 0) {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        processAudioChunk(audioBlob);
      }
      if(vadIntervalRef.current) clearInterval(vadIntervalRef.current);
      if(frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };

    try {
        mediaRecorderRef.current.start();
        setStatus('listening');
    } catch(e) {
        console.error("Failed to start MediaRecorder", e);
        toast({ variant: "destructive", title: "Error de Grabación", description: "No se pudo iniciar la grabación. Intenta recargar la página." });
        setStatus('idle');
        return;
    }

    // --- Voice Activity Detection (VAD) ---
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 512;
    source.connect(analyserRef.current);
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    vadIntervalRef.current = setInterval(() => {
      analyserRef.current?.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length / 255;

      if (volume > VAD_THRESHOLD) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      } else {
        if (mediaRecorderRef.current?.state === 'recording') {
            if (!silenceTimerRef.current) {
                silenceTimerRef.current = setTimeout(() => {
                    mediaRecorderRef.current?.stop();
                    silenceTimerRef.current = null;
                }, SILENCE_DURATION_MS);
            }
        }
      }
    }, 100);
    
    // --- Video Frame Capturing ---
    frameIntervalRef.current = setInterval(() => {
        if(videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            setLatestVideoFrame(canvas.toDataURL('image/jpeg', 0.5));
        }
    }, FRAME_CAPTURE_INTERVAL_MS);

  }, [processAudioChunk, status, toast]);
  
  const stopListening = useCallback(() => {
    mediaRecorderRef.current?.stop();
    if(vadIntervalRef.current) clearInterval(vadIntervalRef.current);
    if(frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if(silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setStatus('idle');
  }, []);

  const addTranscriptEntry = (speaker: 'user' | 'ai', text: string) => {
    setTranscript(prev => [...prev, { id: Date.now().toString(), speaker, text }]);
  }

  // --- UI ---
  const StatusIndicator = () => {
    const config = {
      initializing: { text: 'Iniciando Aether...', color: 'bg-gray-500' },
      idle: { text: 'Toca para hablar', color: 'bg-blue-500' },
      listening: { text: 'Escuchando...', color: 'bg-green-500' },
      processing: { text: 'Pensando...', color: 'bg-yellow-500' },
      speaking: { text: 'Hablando...', color: 'bg-purple-500' },
    };
    const current = config[status];
    return (
      <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full ${current.color} animate-pulse`}></span>
        <span className="text-sm font-semibold">{current.text}</span>
      </div>
    );
  };
  
  if (authLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (!user) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Alert><AlertTitle>Acceso Denegado</AlertTitle><AlertDescription>Debes iniciar sesión para usar Aether.</AlertDescription></Alert></div>;
  }

  return (
     <div className="h-screen w-full bg-black text-white flex flex-col overflow-hidden">
        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4">
            <Button asChild variant="ghost" className="hover:bg-white/10">
                <Link href="/">
                    <ChevronLeft className="mr-2 h-4 w-4"/> Volver
                </Link>
            </Button>
            <StatusIndicator />
        </header>

        <main className="flex-1 relative flex items-center justify-center">
            {/* Video Background */}
            <div className="absolute inset-0 overflow-hidden">
                <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover scale-[-1.1] blur-xl opacity-30" />
            </div>

            {/* Main Content */}
            <AnimatePresence>
                {!hasPermissions ? (
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 text-center">
                        <Alert className="bg-background/50 border-border text-foreground">
                            <Bot className="h-4 w-4"/>
                            <AlertTitle>Permisos Requeridos</AlertTitle>
                            <AlertDescription>Aether necesita acceso a tu cámara y micrófono para funcionar.</AlertDescription>
                        </Alert>
                    </motion.div>
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 w-full h-full flex flex-col justify-between p-4 pt-20">
                       
                        {/* Transcript Area */}
                        <div className="flex-1 overflow-y-auto space-y-4">
                           {transcript.map(entry => (
                               <div key={entry.id} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                                   <p className={`max-w-md rounded-xl px-4 py-2 ${entry.speaker === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                       {entry.text}
                                   </p>
                               </div>
                           ))}
                        </div>

                        {/* Control Button */}
                        <div className="flex-shrink-0 flex justify-center py-8">
                            <button 
                                onClick={status === 'idle' ? startListening : stopListening}
                                className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center shadow-lg transform transition-transform duration-200 hover:scale-110 disabled:opacity-50"
                                disabled={status === 'processing' || status === 'speaking' || status === 'initializing'}
                            >
                                {status === 'listening' ? <Loader2 className="w-8 h-8 animate-spin"/> : <Mic className="w-8 h-8"/>}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
        <audio ref={audioPlayerRef} className="hidden" />
    </div>
  );
}


'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Mic, Settings, WifiOff, Bot, ChevronLeft, Pause, Play, Square } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { aetherAction } from '@/ai/flows/aether-flows';
import { generateSpeech } from '@/ai/flows/speech';
import { AnimatePresence, motion } from 'framer-motion';
import AudioVisualizer from '@/components/dreams/AudioVisualizer';
import RecordingControls from '@/components/dreams/RecordingControls';

// --- TYPES ---
type AetherStatus = 'initializing' | 'idle' | 'listening' | 'processing' | 'speaking' | 'paused';
type TranscriptEntry = {
  id: string;
  speaker: 'user' | 'ai';
  text: string;
};

// --- CONSTANTS ---
const SILENCE_DURATION_MS = 2500; // Time of silence to trigger processing
const FRAME_CAPTURE_INTERVAL_MS = 700; // How often to capture video frames
const AUDIO_FORMAT_CANDIDATES = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/aac',
];

// --- MAIN COMPONENT ---
export default function AetherPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const supportedMimeTypeRef = useRef<string | null>(null);

  // --- State ---
  const [status, setStatus] = useState<AetherStatus>('initializing');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [latestVideoFrame, setLatestVideoFrame] = useState<string | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);

  // --- Permission and Stream Handling ---
  useEffect(() => {
    // Find a supported MIME type once
    supportedMimeTypeRef.current = AUDIO_FORMAT_CANDIDATES.find(
        (mimeType) => MediaRecorder.isTypeSupported(mimeType)
    ) || null;

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
        if(silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if(frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  }, [toast]);


  // --- Core Processing Logic ---
  const processAudioChunk = useCallback(async (audioBlob: Blob) => {
    if (!latestVideoFrame) {
      toast({ variant: 'destructive', title: 'Error de Captura', description: 'No se pudo capturar un fotograma de video.' });
      setStatus('idle');
      return;
    }
    setStatus('processing');
    
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const audioDataUri = reader.result as string;
      const conversationHistory = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');

      try {
        const { responseText } = await aetherAction({
          audioDataUri,
          videoFrameDataUri: latestVideoFrame,
          conversationHistory,
        });

        addTranscriptEntry('ai', responseText);
        
        setStatus('speaking');
        const { media } = await generateSpeech(responseText);
        
        if (audioPlayerRef.current) {
          audioPlayerRef.current.src = media;
          audioPlayerRef.current.play();
          audioPlayerRef.current.onended = () => {
            setStatus('idle');
          };
        }

      } catch (error) {
        console.error('Error processing Aether stream:', error);
        toast({ variant: 'destructive', title: 'Error de IA', description: 'No se pudo procesar la respuesta.' });
        setStatus('idle');
      }
    };
  }, [latestVideoFrame, toast, transcript]);
  
  const startSilenceDetection = useCallback(() => {
    if (!streamRef.current || !analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const checkSilence = () => {
        analyserRef.current?.getByteFrequencyData(dataArray);
        const volume = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        
        if (volume < 5) { // Lower threshold for silence
            if (!silenceTimerRef.current) {
                silenceTimerRef.current = setTimeout(() => {
                    if (mediaRecorderRef.current?.state === 'recording') {
                        mediaRecorderRef.current.stop();
                    }
                }, SILENCE_DURATION_MS);
            }
        } else {
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
        }

        if (status === 'listening' || status === 'paused') {
            requestAnimationFrame(checkSilence);
        }
    };
    checkSilence();
  }, [status]);


  // --- VAD and Recording Logic ---
  const startListening = useCallback(() => {
    if (!streamRef.current || (status !== 'idle' && status !== 'paused')) return;
    
    if (!supportedMimeTypeRef.current) {
        toast({ variant: "destructive", title: "Error de Grabación", description: "Tu navegador no soporta los formatos de audio necesarios." });
        setStatus('idle');
        return;
    }

    if (status === 'paused' && mediaRecorderRef.current) {
        mediaRecorderRef.current.resume();
        setStatus('listening');
        return;
    }

    try {
        mediaRecorderRef.current = new MediaRecorder(streamRef.current, { mimeType: supportedMimeTypeRef.current });
    } catch (e) {
        console.error("Failed to create MediaRecorder", e);
        toast({ variant: "destructive", title: "Error de Grabación", description: "No se pudo iniciar el grabador de audio." });
        setStatus('idle');
        return;
    }
    
    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = () => {
      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: supportedMimeTypeRef.current! });
        processAudioChunk(audioBlob);
      }
      if(frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };

    try {
        mediaRecorderRef.current.start(250); // Slice recording for better real-time feel
        setStatus('listening');
    } catch(e) {
        console.error("Failed to execute 'start' on 'MediaRecorder'", e);
        toast({ variant: "destructive", title: "Error al Grabar", description: `Hubo un problema al iniciar la grabación. ${e}` });
        setStatus('idle');
        return;
    }

    // --- Voice Activity Detection (VAD) ---
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);
    }
    startSilenceDetection();
    
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

  }, [processAudioChunk, status, toast, startSilenceDetection]);
  
  const pauseListening = useCallback(() => {
    if(mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.pause();
        setStatus('paused');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
        mediaRecorderRef.current.stop();
        // The onstop event handler will do the rest
    }
    // Set status to idle to allow a new recording to start
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
      paused: { text: 'Pausado', color: 'bg-yellow-500'},
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

                         {/* Visualizer */}
                        <div className="flex-shrink-0 flex justify-center h-20 -mt-8">
                             {(status === 'listening' || status === 'paused' || status === 'speaking') && (
                                <AudioVisualizer stream={streamRef.current} />
                            )}
                        </div>

                        {/* Control Button */}
                        <div className="flex-shrink-0 flex justify-center py-8">
                           <RecordingControls 
                                status={status as any} 
                                onStart={startListening} 
                                onPause={pauseListening} 
                                onResume={startListening} 
                                onStop={stopListening} 
                                onClear={() => {}}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
        <audio ref={audioPlayerRef} className="hidden" />
    </div>
  );
}


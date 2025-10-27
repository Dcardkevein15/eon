'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, Mic, Pause, Brain, AlertTriangle, User, ChevronLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { analyzeVoiceMessageAction, getAIResponse } from '@/app/actions';
import { generateSpeech } from '@/ai/flows/speech';
import type { Message, ProfileData } from '@/lib/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const VAD_THRESHOLD = 0.2; // Voice Activity Detection threshold
const SILENCE_TIMEOUT = 1200; // ms

function usePsychologicalProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (user) {
      const key = `psych-profile-${user.uid}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        setProfile(JSON.parse(cached).profile);
      }
    }
  }, [user]);

  return profile;
}

const AIVisualizer = ({ state }: { state: 'listening' | 'thinking' | 'speaking' }) => {
  return (
    <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
      <AnimatePresence>
        <motion.div
          key={state}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.5 }}
          className="absolute"
        >
          {state === 'listening' && (
            <motion.div
              className="w-full h-full rounded-full bg-primary/10"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          {state === 'speaking' && (
            <motion.div
              className="w-full h-full rounded-full border-2 border-accent"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          {state === 'thinking' && (
             <Brain className="w-24 h-24 text-primary" />
          )}
        </motion.div>
      </AnimatePresence>
       <div className="absolute rounded-full w-full h-full border border-border/50" />
    </div>
  );
};


export default function VisionPage() {
  const { user, loading: authLoading } = useAuth();
  const profile = usePsychologicalProfile();
  const { toast } = useToast();

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiState, setAiState] = useState<'listening' | 'thinking' | 'speaking'>('listening');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef(false);

  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setHasPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      source.connect(analyserRef.current);

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstart = () => {
        audioChunksRef.current = [];
        setTranscript('');
      }

      mediaRecorderRef.current.onstop = async () => {
        if (isSpeakingRef.current || audioChunksRef.current.length === 0) return;
        
        setIsProcessing(true);
        setAiState('thinking');
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioDataUri = await blobToDataUri(audioBlob);
        
        try {
            const { transcription } = await analyzeVoiceMessageAction({ audioDataUri });

            if (transcription && transcription.trim().length > 0) {
              setTranscript(transcription);
              const userMessage: Message = { id: Date.now().toString(), role: 'user', content: transcription, timestamp: new Date() };
              const newConversation = [...conversation, userMessage];
              setConversation(newConversation);
              await processAIResponse(newConversation);
            }
        } catch (e) {
            console.error("Error processing audio:", e);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo procesar tu voz.' });
        } finally {
            setIsProcessing(false);
            if(isSessionActive) startRecording(); // Restart recording for next turn
        }
      };
      setIsSessionActive(true);

    } catch (error) {
      console.error('Error accessing media devices.', error);
      setHasPermission(false);
      toast({ variant: 'destructive', title: 'Acceso Denegado', description: 'Por favor, permite el acceso a la cámara y el micrófono.' });
    }
  }, [conversation, isSessionActive]);

  const processAIResponse = async (currentConversation: Message[]) => {
      if (!user) return;
      
      const { response: textResponse, newRole } = await getAIResponse(currentConversation, user.uid, conversation[0]?.anchorRole || null, profile);
      const aiMessage: Message = { id: Date.now().toString(), role: 'assistant', content: textResponse, timestamp: new Date() };
      setConversation(prev => [...prev, aiMessage]);

      const { media } = await generateSpeech(textResponse);
      
      setAiState('speaking');
      isSpeakingRef.current = true;
      
      const audio = new Audio(media);
      audioPlayerRef.current = audio;
      audio.play();
      
      audio.onended = () => {
          setAiState('listening');
          isSpeakingRef.current = false;
      };
  };

  const startRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
      mediaRecorderRef.current.start(1000); // Collect data in 1s chunks
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
    if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
    }
  };
  
  useEffect(() => {
    let animationFrameId: number;

    const monitorAudio = () => {
      if (analyserRef.current && mediaRecorderRef.current?.state === 'recording' && !isSpeakingRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);
        const volume = dataArray.reduce((acc, val) => acc + Math.abs(val - 128), 0) / dataArray.length / 128;

        if (volume > VAD_THRESHOLD) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(stopRecording, SILENCE_TIMEOUT);
          }
        }
      }
      animationFrameId = requestAnimationFrame(monitorAudio);
    };

    if(isSessionActive) {
      startRecording();
      animationFrameId = requestAnimationFrame(monitorAudio);
    }

    return () => {
        cancelAnimationFrame(animationFrameId);
        stopRecording();
    };
  }, [isSessionActive]);
  
  const handleStopSession = () => {
      setIsSessionActive(false);
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      if(mediaRecorderRef.current) mediaRecorderRef.current.onstop = null;
      audioContextRef.current?.close();
  }

  const blobToDataUri = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
  }


  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col items-center justify-center p-4 relative">
       <Button asChild variant="ghost" className="absolute top-4 left-4 text-muted-foreground hover:text-foreground">
          <Link href="/">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Volver al Inicio
          </Link>
       </Button>

      {hasPermission === false && (
        <Card className="max-w-md text-center bg-card/50">
          <Card.Header><Card.Title>Permisos Necesarios</Card.Title></Card.Header>
          <Card.Content>
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Para iniciar una sesión de visión, necesitamos acceso a tu cámara y micrófono.</p>
            <Button onClick={startMedia}>Reintentar Permisos</Button>
          </Card.Content>
        </Card>
      )}

      {!isSessionActive && hasPermission !== false && (
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Visión IA</h1>
          <p className="text-muted-foreground mb-8">Inicia una conversación cara a cara con tu asistente.</p>
          <Button onClick={startMedia} size="lg" disabled={authLoading}>
            {authLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Mic className="mr-2 h-5 w-5" />}
            Iniciar Sesión
          </Button>
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
              <p className="text-xl sm:text-2xl text-muted-foreground h-16">{transcript || '...'}</p>
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
               <Button onClick={handleStopSession} variant="destructive">
                  Finalizar Sesión
               </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

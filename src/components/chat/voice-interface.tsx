'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, X, Bot, BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceInterfaceProps {
  onClose: () => void;
  onProcessAudio: (transcribedText: string) => Promise<{ text: string, audio: string } | undefined>;
}

enum Status {
  Idle,
  RequestingPermission,
  Listening,
  Processing,
  Speaking,
  Error
}

const statusInfo = {
  [Status.Idle]: { text: 'Toca el orbe para hablar', icon: Mic },
  [Status.RequestingPermission]: { text: 'Solicitando permiso...', icon: Loader2 },
  [Status.Listening]: { text: 'Escuchando...', icon: Mic },
  [Status.Processing]: { text: 'Nimbus está pensando...', icon: BrainCircuit },
  [Status.Speaking]: { text: 'Nimbus está respondiendo...', icon: Bot },
  [Status.Error]: { text: 'Hubo un error. Toca para reintentar.', icon: Mic },
};

export default function VoiceInterface({ onClose, onProcessAudio }: VoiceInterfaceProps) {
  const [status, setStatus] = useState<Status>(Status.Idle);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [volume, setVolume] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    sourceRef.current?.disconnect();
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    recognitionRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    setVolume(0);
  }, []);

  const processAndRespond = useCallback(async (finalTranscript: string) => {
    stopListening();
    if (!finalTranscript.trim()) {
      setStatus(Status.Idle);
      return;
    }
    
    setStatus(Status.Processing);
    setTranscript(finalTranscript);

    try {
      const response = await onProcessAudio(finalTranscript);
      if (response) {
        setAiResponse(response.text);
        setStatus(Status.Speaking);
        
        const audio = new Audio(response.audio);
        audioPlaybackRef.current = audio;
        audio.play();
        audio.onended = () => {
          setStatus(Status.Idle);
          setAiResponse('');
          setTranscript('');
        };
      } else {
        throw new Error("La IA no devolvió una respuesta de audio válida.");
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || "Ocurrió un error al procesar tu voz.");
      setStatus(Status.Error);
    }
  }, [onProcessAudio, stopListening]);


  const startListening = useCallback(async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('El reconocimiento de voz no es compatible con este navegador.');
      setStatus(Status.Error);
      return;
    }

    setStatus(Status.RequestingPermission);
    setTranscript('');
    setAiResponse('');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        setStatus(Status.Listening);

        // Setup recognition
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = 'es-ES';
        recognitionRef.current.interimResults = true;
        recognitionRef.current.continuous = true;

        recognitionRef.current.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setTranscript(interimTranscript);
            if (finalTranscript) {
                processAndRespond(finalTranscript);
            }
        };

        recognitionRef.current.onend = () => {
            if (status !== Status.Processing && status !== Status.Speaking) {
                 processAndRespond(transcript);
            }
        };

        recognitionRef.current.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            setErrorMessage(`Error de reconocimiento: ${event.error}`);
            setStatus(Status.Error);
            stopListening();
        };

        recognitionRef.current.start();
        
        // Setup Volume Meter
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 512;
        sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        sourceRef.current.connect(analyserRef.current);
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        const updateVolume = () => {
            if (analyserRef.current) {
                analyserRef.current.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
                setVolume(avg / 128); // Normalize to 0-1 range
            }
            animationFrameIdRef.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();

    } catch (err) {
        console.error("Error accessing microphone:", err);
        setErrorMessage('No se pudo acceder al micrófono. Por favor, concede permiso.');
        setStatus(Status.Error);
    }
  }, [processAndRespond, stopListening, status, transcript]);

  const handleOrbClick = useCallback(() => {
    if (status === Status.Idle || status === Status.Error) {
      startListening();
    } else if (status === Status.Listening) {
      recognitionRef.current?.stop();
    }
  }, [status, startListening]);
  
  useEffect(() => {
      // Cleanup function when component unmounts
      return () => {
          stopListening();
          if (audioPlaybackRef.current) {
              audioPlaybackRef.current.pause();
          }
      };
  }, [stopListening]);


  const StatusIcon = statusInfo[status].icon;
  const isOrbActive = status === Status.Listening;
  const isProcessing = status === Status.Processing || status === Status.RequestingPermission;
  const orbScale = isOrbActive ? 1 + volume * 0.3 : 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex flex-col items-center justify-center p-4"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-white"
      >
        <X className="h-6 w-6" />
      </Button>

      <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
        {/* Outer rotating rings */}
        <motion.div
            className="absolute w-full h-full rounded-full border-2 border-primary/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
            className="absolute w-[85%] h-[85%] rounded-full border-2 border-accent/20"
            animate={{ rotate: -360 }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        />

        {/* Pulsing glow */}
        <motion.div
          className="absolute w-full h-full rounded-full bg-primary"
          animate={{ 
            scale: isOrbActive ? 1 + volume * 0.5 : 1.1,
            opacity: isOrbActive ? 0.3 + volume * 0.3 : 0.2
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
        
        {/* Central Orb */}
        <motion.div
          onClick={handleOrbClick}
          className={cn(
            "w-48 h-48 md:w-56 md:h-56 rounded-full cursor-pointer flex items-center justify-center bg-card shadow-2xl transition-colors duration-500",
            status === Status.Listening && "bg-primary/50",
            status === Status.Speaking && "bg-accent/50",
          )}
          style={{
            boxShadow: `0 0 20px 5px hsl(var(--primary) / 0.3), 0 0 40px 10px hsl(var(--primary) / 0.2)`
          }}
          animate={{ scale: orbScale }}
          whileHover={{ scale: (status === Status.Idle || status === Status.Error) ? 1.05 : orbScale }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <StatusIcon className={cn(
            "h-16 w-16 md:h-20 md:w-20 text-foreground/80 transition-colors",
            status === Status.Listening && "text-primary-foreground",
            status === Status.Speaking && "text-accent-foreground",
            isProcessing && "animate-spin"
            )}
          />
        </motion.div>
      </div>
      
      <div className="text-center mt-12 h-36 flex flex-col justify-center items-center text-foreground w-full max-w-2xl">
        <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="w-full"
            >
              <p className="text-xl font-medium tracking-tight mb-4">
                {status === Status.Error ? errorMessage : statusInfo[status].text}
              </p>
              
              <div className="text-lg mt-2 h-16 text-muted-foreground transition-all duration-300">
                  {status === Status.Listening && <p>{transcript}&nbsp;</p>}
                  {(status === Status.Processing && transcript) && <p>"{transcript}"</p>}
                  {status === Status.Speaking && <p>{aiResponse}</p>}
              </div>
            </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

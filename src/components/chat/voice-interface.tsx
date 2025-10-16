'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2, X, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceInterfaceProps {
  onClose: () => void;
  onProcessAudio: (transcribedText: string) => Promise<{ text: string, audio: string } | undefined>;
}

enum Status {
  Idle,
  Listening,
  Processing,
  Speaking,
  Error
}

const statusInfo = {
  [Status.Idle]: { text: 'Toca el orbe para hablar', icon: Mic },
  [Status.Listening]: { text: 'Escuchando...', icon: Mic },
  [Status.Processing]: { text: 'Procesando tu voz...', icon: Loader2 },
  [Status.Speaking]: { text: 'Nimbus está respondiendo...', icon: Bot },
  [Status.Error]: { text: 'Hubo un error. Toca para reintentar.', icon: MicOff },
};

export default function VoiceInterface({ onClose, onProcessAudio }: VoiceInterfaceProps) {
  const [status, setStatus] = useState<Status>(Status.Idle);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [volume, setVolume] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number>();

  // Refs to get latest state in callbacks
  const statusRef = useRef(status);
  const transcriptRef = useRef(transcript);
  useEffect(() => {
    statusRef.current = status;
    transcriptRef.current = transcript;
  }, [status, transcript]);


  const stopListeningAndProcess = useCallback(async (finalTranscript: string) => {
      if (statusRef.current !== Status.Listening) return;

      if (recognitionRef.current) {
          recognitionRef.current.stop();
      }
      
      if (finalTranscript.trim().length === 0) {
          setStatus(Status.Idle);
          return;
      }
      
      setStatus(Status.Processing);
      
      try {
          const response = await onProcessAudio(finalTranscript);
          if (response) {
              setAiResponse(response.text);
              setStatus(Status.Speaking);
              const audio = new Audio(response.audio);
              audioRef.current = audio;
              audio.play();
              audio.onended = () => {
                  setStatus(Status.Idle);
                  setAiResponse('');
              };
          } else {
              setStatus(Status.Error);
          }
      } catch (e) {
          console.error(e);
          setStatus(Status.Error);
      }
  }, [onProcessAudio]);

  const startListening = useCallback(async () => {
    if (status === Status.Listening || status === Status.Processing) return;

    setTranscript('');
    setAiResponse('');
    setStatus(Status.Listening);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus(Status.Error);
      alert('La API de reconocimiento de voz no es compatible con este navegador.');
      return;
    }

    try {
        // Request permission and get stream first
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = 'es-ES';
        recognitionRef.current.interimResults = true;
        recognitionRef.current.continuous = false;

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
          setTranscript(prev => finalTranscript || interimTranscript);
        };
        
        recognitionRef.current.onend = () => {
            // Check the status before deciding to stop.
            // This prevents transitioning to Idle if we're already Processing.
            if (statusRef.current === Status.Listening) {
                 stopListeningAndProcess(transcriptRef.current);
            }
        };
        
        recognitionRef.current.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            setStatus(Status.Error);
        };
        
        recognitionRef.current.start();

        // Setup Volume Meter
        if (!audioContextRef.current) {
            const context = new AudioContext();
            audioContextRef.current = context;
            analyserRef.current = context.createAnalyser();
            analyserRef.current.fftSize = 256;
            sourceRef.current = context.createMediaStreamSource(stream);
            sourceRef.current.connect(analyserRef.current);
            
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

            const updateVolume = () => {
              if (analyserRef.current) {
                analyserRef.current.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
                setVolume(avg / 128); // Normalize to 0-1 range
              }
              animationFrameRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();
        }
    } catch (err) {
        console.error("Error accessing microphone:", err);
        setStatus(Status.Error);
    }
  }, [status, stopListeningAndProcess]);
  

  const handleOrbClick = () => {
    if (status === Status.Idle || status === Status.Error) {
      startListening();
    } else if (status === Status.Listening) {
      stopListeningAndProcess(transcript);
    }
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (sourceRef.current) sourceRef.current.disconnect();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
         audioContextRef.current.close();
      }
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
      }
    };
  }, []);

  const StatusIcon = statusInfo[status].icon;
  const isOrbActive = status === Status.Listening || status === Status.Processing;
  const orbScale = isOrbActive ? 1 + volume * 0.5 : 1;
  const orbColor = status === Status.Listening ? 'hsl(var(--primary))' : status === Status.Speaking ? 'hsl(var(--accent))' : 'hsl(var(--muted))';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-white"
      >
        <X className="h-6 w-6" />
      </Button>

      <div className="relative w-64 h-64 flex items-center justify-center">
        <motion.div
          className="absolute w-full h-full rounded-full border-2"
          style={{ borderColor: orbColor }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          onClick={handleOrbClick}
          className="w-48 h-48 rounded-full cursor-pointer flex items-center justify-center"
          style={{ backgroundColor: orbColor }}
          animate={{ scale: orbScale }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <StatusIcon className={`h-16 w-16 text-background ${status === Status.Processing ? 'animate-spin' : ''}`} />
        </motion.div>
      </div>
      
      <div className="text-center mt-8 h-32 text-foreground/80">
        <AnimatePresence mode="wait">
            <motion.p
              key={status}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="text-xl font-medium tracking-tight"
            >
              {statusInfo[status].text}
            </motion.p>
        </AnimatePresence>

        <div className="text-lg mt-4 h-16 max-w-xl mx-auto">
            {status === Status.Listening && <p>{transcript}</p>}
            {status === Status.Speaking && <p>{aiResponse}</p>}
        </div>
      </div>
    </motion.div>
  );
}

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


/**
 * Controller class to manage all Web Audio and Speech Recognition APIs.
 * This encapsulates the complexity and ensures resources are handled correctly.
 */
class AudioController {
    private recognition: SpeechRecognition | null = null;
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private animationFrameId: number | null = null;
    private stream: MediaStream | null = null;

    private readonly onTranscriptUpdate: (transcript: string, isFinal: boolean) => void;
    private readonly onVolumeChange: (volume: number) => void;
    private readonly onListeningEnd: () => void;
    private readonly onError: (error: string) => void;

    constructor({ onTranscriptUpdate, onVolumeChange, onListeningEnd, onError }: {
        onTranscriptUpdate: (transcript: string, isFinal: boolean) => void;
        onVolumeChange: (volume: number) => void;
        onListeningEnd: () => void;
        onError: (error: string) => void;
    }) {
        this.onTranscriptUpdate = onTranscriptUpdate;
        this.onVolumeChange = onVolumeChange;
        this.onListeningEnd = onListeningEnd;
        this.onError = onError;
    }

    private async getStream(): Promise<MediaStream> {
        if (this.stream) return this.stream;
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return this.stream;
    }

    public async startListening(): Promise<void> {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this.onError('La API de reconocimiento de voz no es compatible con este navegador.');
            return;
        }

        try {
            const stream = await this.getStream();
            
            // Setup recognition
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'es-ES';
            this.recognition.interimResults = true;
            this.recognition.continuous = true;

            this.recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                this.onTranscriptUpdate(finalTranscript || interimTranscript, !!finalTranscript);
            };

            this.recognition.onend = () => {
                this.onListeningEnd();
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                this.onError(`Error de reconocimiento: ${event.error}`);
            };

            this.recognition.start();
            this.startVolumeMeter(stream);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            this.onError('No se pudo acceder al micrófono. Por favor, concede permiso.');
        }
    }

    public stopListening(): void {
        if (this.recognition) {
            this.recognition.stop();
        }
        this.stopVolumeMeter();
    }
    
    private startVolumeMeter(stream: MediaStream): void {
        if (!this.audioContext) {
            this.audioContext = new AudioContext();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512;
            this.source = this.audioContext.createMediaStreamSource(stream);
            this.source.connect(this.analyser);
        }

        const dataArray = new Uint8Array(this.analyser!.frequencyBinCount);
        const updateVolume = () => {
            if (this.analyser) {
                this.analyser.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
                this.onVolumeChange(avg / 128); // Normalize to 0-1 range
            }
            this.animationFrameId = requestAnimationFrame(updateVolume);
        };
        updateVolume();
    }

    private stopVolumeMeter(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    
    public cleanup(): void {
        this.stopListening();
        this.stream?.getTracks().forEach(track => track.stop());
        this.source?.disconnect();
        if (this.audioContext && this.audioContext.state !== 'closed') {
           this.audioContext.close();
        }
        this.recognition = null;
        this.audioContext = null;
        this.stream = null;
    }
}


export default function VoiceInterface({ onClose, onProcessAudio }: VoiceInterfaceProps) {
  const [status, setStatus] = useState<Status>(Status.Idle);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [volume, setVolume] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const audioControllerRef = useRef<AudioController | null>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);
  
  const processAndRespond = useCallback(async (finalTranscript: string) => {
    if (!finalTranscript.trim()) {
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
        audioPlaybackRef.current = audio;
        audio.play();
        audio.onended = () => {
          setStatus(Status.Idle);
          setAiResponse('');
        };
      } else {
        throw new Error("La IA no devolvió una respuesta de audio válida.");
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || "Ocurrió un error al procesar tu voz.");
      setStatus(Status.Error);
    }
  }, [onProcessAudio]);


  useEffect(() => {
    audioControllerRef.current = new AudioController({
      onTranscriptUpdate: (text, isFinal) => {
        setTranscript(text);
        if (isFinal) {
           audioControllerRef.current?.stopListening();
           processAndRespond(text);
        }
      },
      onVolumeChange: setVolume,
      onListeningEnd: () => {
        if (status !== Status.Processing && status !== Status.Speaking) {
           // This handles cases where recognition ends naturally (e.g., silence)
           // and we haven't already started processing a final transcript.
           processAndRespond(transcript);
        }
      },
      onError: (error) => {
        setErrorMessage(error);
        setStatus(Status.Error);
      }
    });

    return () => {
      audioControllerRef.current?.cleanup();
      if (audioPlaybackRef.current) {
          audioPlaybackRef.current.pause();
      }
    };
  }, [processAndRespond, status, transcript]);

  const handleOrbClick = useCallback(() => {
    if (status === Status.Idle || status === Status.Error) {
      setTranscript('');
      setAiResponse('');
      setErrorMessage('');
      setStatus(Status.Listening);
      audioControllerRef.current?.startListening();
    } else if (status === Status.Listening) {
      audioControllerRef.current?.stopListening(); // This will trigger onListeningEnd -> processAndRespond
    }
  }, [status]);


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
            ...(status !== Status.Listening && { repeat: 0, duration: 0.5 })
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
              {status === Status.Error ? errorMessage : statusInfo[status].text}
            </motion.p>
        </AnimatePresence>

        <div className="text-lg mt-4 h-16 max-w-xl mx-auto">
            {(status === Status.Listening || (status === Status.Processing && transcript)) && <p>{transcript}</p>}
            {status === Status.Speaking && <p>{aiResponse}</p>}
        </div>
      </div>
    </motion.div>
  );
}
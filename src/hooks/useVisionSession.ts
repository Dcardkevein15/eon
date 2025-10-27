'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/firebase';
import { analyzeVoiceMessageAction, getAIResponse } from '@/app/actions';
import { generateSpeech } from '@/ai/flows/speech';
import type { Message, ProfileData, CachedProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const VAD_THRESHOLD = 0.2; // Voice Activity Detection threshold
const SILENCE_TIMEOUT = 1200; // ms

interface UseVisionSessionProps {
    videoRef: React.RefObject<HTMLVideoElement>;
}

export function useVisionSession({ videoRef }: UseVisionSessionProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<'idle' | 'prompt' | 'granted' | 'denied'>('idle');
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiState, setAiState] = useState<'listening' | 'thinking' | 'speaking'>('listening');
    const [conversation, setConversation] = useState<Message[]>([]);
    const [transcript, setTranscript] = useState('');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const isSpeakingRef = useRef(false);
    const animationFrameIdRef = useRef<number | null>(null);

    // Load user profile from localStorage
    useEffect(() => {
        if (user) {
            const key = `psych-profile-${user.uid}`;
            const cached = localStorage.getItem(key);
            if (cached) {
                try {
                    setProfile(JSON.parse(cached).profile as ProfileData);
                } catch (e) {
                    console.error("Failed to parse cached profile", e);
                }
            }
        }
    }, [user]);

    const blobToDataUri = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const processAIResponse = async (currentConversation: Message[]) => {
      if (!user) return;
      
      const { response: textResponse } = await getAIResponse(
          currentConversation.map(m => ({ ...m, timestamp: new Date() })),
          user.uid,
          currentConversation[0]?.anchorRole || null,
          profile
      );
      
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

    const stopRecording = useCallback(async () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }

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
            if(isSessionActive) {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
                    mediaRecorderRef.current.start(1000);
                }
            }
        }
    }, [conversation, isSessionActive, processAIResponse, toast, user]);

    const monitorAudio = useCallback(() => {
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
      animationFrameIdRef.current = requestAnimationFrame(monitorAudio);
    }, [stopRecording]);

    const startSession = useCallback(async () => {
        if (isSessionActive) return;
        setPermissionStatus('prompt');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setPermissionStatus('granted');
            
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
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstart = () => audioChunksRef.current = [];
            
            setIsSessionActive(true);

        } catch (error) {
            console.error('Error accessing media devices.', error);
            setPermissionStatus('denied');
            toast({ variant: 'destructive', title: 'Acceso Denegado', description: 'Por favor, permite el acceso a la cámara y el micrófono en los ajustes de tu navegador.' });
        }
    }, [isSessionActive, toast, videoRef]);
    
    useEffect(() => {
        if (isSessionActive) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
                mediaRecorderRef.current.start(1000);
            }
            monitorAudio();
        }

        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
        };
    }, [isSessionActive, monitorAudio]);


    const stopSession = () => {
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        
        setIsSessionActive(false);
        setConversation([]);
        setTranscript('');

        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
             mediaRecorderRef.current.stop();
        }

        audioContextRef.current?.close();
        audioPlayerRef.current?.pause();
        isSpeakingRef.current = false;
        
        setPermissionStatus('idle');
    };

    return {
        isSessionActive,
        aiState,
        permissionStatus,
        transcript,
        startSession,
        stopSession,
    };
}

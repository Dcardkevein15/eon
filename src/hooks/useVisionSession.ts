'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/firebase';
import { getAIResponse } from '@/ai/flows/vision/voice-chat';
import type { Message, ProfileData, CachedProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { analyzeVoiceMessageAction } from '@/app/actions';


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
    const [isRecording, setIsRecording] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

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
      
      const { response: textResponse, audioUrl: audioDataUri } = await getAIResponse(
          currentConversation.map(m => ({ ...m, timestamp: new Date() })),
          user.uid,
          currentConversation[0]?.anchorRole || null,
          profile
      );
      
      const aiMessage: Message = { id: Date.now().toString(), role: 'assistant', content: textResponse, timestamp: new Date() };
      setConversation(prev => [...prev, aiMessage]);

      setAiState('speaking');
      
      const audio = new Audio(audioDataUri);
      audioPlayerRef.current = audio;
      audio.play();
      
      audio.onended = () => {
          setAiState('listening');
      };
    };

    const startSession = useCallback(async () => {
        if (isSessionActive) return;
        setPermissionStatus('prompt');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;
            setPermissionStatus('granted');
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            setIsSessionActive(true);
            setAiState('listening');

        } catch (error) {
            console.error('Error accessing media devices.', error);
            setPermissionStatus('denied');
            toast({ variant: 'destructive', title: 'Acceso Denegado', description: 'Por favor, permite el acceso a la cámara y el micrófono en los ajustes de tu navegador.' });
        }
    }, [isSessionActive, toast, videoRef]);

    const stopSession = () => {
        setIsSessionActive(false);
        setConversation([]);
        setTranscript('');
        setIsRecording(false);

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
             mediaRecorderRef.current.stop();
        }

        audioContextRef.current?.close();
        audioPlayerRef.current?.pause();
        
        setPermissionStatus('idle');
    };

    const toggleRecording = async () => {
        if (isRecording) {
            // Stop recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
        } else {
            // Start recording
            if (!streamRef.current) return;

            // Let browser pick the format
            mediaRecorderRef.current = new MediaRecorder(streamRef.current);
            
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current);
                if (audioBlob.size === 0) return;

                setIsProcessing(true);
                setAiState('thinking');
                
                try {
                    const audioDataUri = await blobToDataUri(audioBlob);
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
                    if (isSessionActive) {
                        setAiState('listening');
                    }
                }
            };
            
            mediaRecorderRef.current.start();
            setIsRecording(true);
        }
    };


    return {
        isSessionActive,
        aiState,
        permissionStatus,
        transcript,
        startSession,
        stopSession,
        isRecording,
        toggleRecording,
        isProcessing,
    };
}

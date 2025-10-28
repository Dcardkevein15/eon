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

export const useVoiceSession = ({ videoRef }: UseVisionSessionProps) => {
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
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

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
      
      if (!textResponse && !audioDataUri) {
          setAiState('listening');
          return;
      }

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
            // Only request video here to show the user's face. Audio will be requested on record.
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = videoStream;
            setPermissionStatus('granted');
            
            if (videoRef.current) {
                videoRef.current.srcObject = videoStream;
            }

            setIsSessionActive(true);
            setAiState('listening');

        } catch (error) {
            console.error('Error accessing media devices.', error);
            setPermissionStatus('denied');
            toast({ variant: 'destructive', title: 'Acceso a Cámara Denegado', description: 'Por favor, permite el acceso a la cámara en los ajustes de tu navegador.' });
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

        audioPlayerRef.current?.pause();
        
        setPermissionStatus('idle');
    };
    
    const toggleRecording = useCallback(async () => {
        if (isRecording) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            return;
        }

        try {
            // Request audio stream right before recording
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // If there's a video stream, combine them. Otherwise, just use audio.
            const tracks = [...audioStream.getAudioTracks()];
            if (streamRef.current) {
                tracks.push(...streamRef.current.getVideoTracks());
            }
            const combinedStream = new MediaStream(tracks);

            const recorder = new MediaRecorder(combinedStream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current);
                // Stop only the audio track to allow video to continue
                audioStream.getTracks().forEach(track => track.stop());

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
                    } else {
                      setAiState('listening');
                    }
                } catch (e) {
                    console.error("Error processing audio:", e);
                    toast({ variant: 'destructive', title: 'Error', description: 'No se pudo procesar tu voz.' });
                    setAiState('listening');
                } finally {
                    setIsProcessing(false);
                }
            };
            
            recorder.start();
            setIsRecording(true);

        } catch (err) {
            console.error("Failed to start MediaRecorder:", err);
            toast({ variant: 'destructive', title: 'Error de Grabación', description: 'No se pudo iniciar la grabación. Asegúrate de permitir el acceso al micrófono.' });
            setIsRecording(false);
        }
    }, [isRecording, conversation, user, profile, toast]);


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
};

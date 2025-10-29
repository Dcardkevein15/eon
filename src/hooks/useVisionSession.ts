'use client';

import { useState, useRef, useEffect, useCallback, RefObject } from 'react';
import { useAuth } from '@/firebase';
import type { Message } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getVisionAIResponse } from '@/ai/flows/vision/voice-chat';

interface UseVisionSessionProps {
    videoRef: RefObject<HTMLVideoElement>;
}

export const useVoiceSession = ({ videoRef }: UseVisionSessionProps) => {
    const { user } = useAuth();
    const { toast } = useToast();

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

    const captureFrame = (): string => {
        if (!videoRef.current) return '';
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.8);
    };

    const blobToDataUri = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
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
            toast({ variant: 'destructive', title: 'Acceso Denegado', description: 'Por favor, permite el acceso a la cámara y micrófono.' });
        }
    }, [isSessionActive, toast, videoRef]);

    const stopSession = () => {
        setIsSessionActive(false);
        setConversation([]);
        setTranscript('');
        setIsRecording(false);
        setIsProcessing(false);
        setAiState('listening');

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

        if (!streamRef.current) {
             toast({ variant: 'destructive', title: 'Error de Stream', description: 'No se pudo acceder al stream de medios.' });
             return;
        }
        
        // Use the existing stream from startSession
        const recorder = new MediaRecorder(streamRef.current);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        recorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            
            if (audioBlob.size === 0) return;

            setIsProcessing(true);
            setAiState('thinking');
            
            try {
                const audioDataUri = await blobToDataUri(audioBlob);
                const imageDataUri = captureFrame();

                const historyForAI = conversation.map(({ role, content }) => ({ role, content }));
                
                const result = await getVisionAIResponse({
                    audioDataUri,
                    imageDataUri,
                    conversationHistory: historyForAI
                });
                
                if (result.transcription) {
                    setTranscript(result.transcription);
                    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: result.transcription, timestamp: new Date() };
                    const aiMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: result.textResponse, timestamp: new Date() };
                    setConversation(prev => [...prev, userMessage, aiMessage]);

                    setAiState('speaking');
                    const audio = new Audio(result.audioResponseUrl);
                    audioPlayerRef.current = audio;
                    audio.play();
                    audio.onended = () => {
                        setAiState('listening');
                    };
                } else {
                     setAiState('listening');
                }

            } catch (e) {
                console.error("Error processing audio/vision:", e);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo procesar tu respuesta.' });
                setAiState('listening');
            } finally {
                setIsProcessing(false);
            }
        };
        
        recorder.start();
        setIsRecording(true);

    }, [isRecording, conversation, toast]);

    // Clean up on component unmount
    useEffect(() => {
      return () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      }
    }, []);


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

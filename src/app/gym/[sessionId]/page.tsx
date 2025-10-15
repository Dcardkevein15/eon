
'use client';

import { useState, useCallback, memo, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Message, SimulationSession, SimulationScenario } from '@/lib/types';
import { runSimulation } from '@/ai/flows/run-simulation';
import { generateSimulationFeedback } from '@/ai/flows/generate-simulation-feedback';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import ChatInput from '@/components/chat/chat-input';
import ChatMessages from '@/components/chat/chat-messages';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Bot, LifeBuoy } from 'lucide-react';
import { SIMULATION_SCENARIOS } from '@/lib/placeholder-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { SecurityRuleContext } from '@/firebase/errors';


function SimulationPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [session, setSession] = useState<SimulationSession | null>(null);
  const [scenario, setScenario] = useState<SimulationScenario | null>(null);
  const [isResponding, setIsResponding] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Fetch session and scenario data
  useEffect(() => {
    if (!user || !firestore || !sessionId) return;
    const fetchSessionData = async () => {
      setSessionLoading(true);
      const sessionRef = doc(firestore, `users/${user.uid}/gymSessions`, sessionId);
      try {
        const sessionSnap = await getDoc(sessionRef);

        if (sessionSnap.exists()) {
          const sessionData = sessionSnap.data() as SimulationSession;
          setSession(sessionData);
          // In a real app, scenarios might be in Firestore. Here we get from placeholder.
          const scenarioData = SIMULATION_SCENARIOS.find(s => s.id === sessionData.scenarioId);
          setScenario(scenarioData || null);
          if (sessionData.feedback) {
              setFeedback(sessionData.feedback);
          }
        } else {
          console.error("Session not found");
          toast({ variant: "destructive", title: "Error", description: "Sesión no encontrada." });
          router.push('/gym');
        }
      } catch (serverError: any) {
         if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
              path: sessionRef.path,
              operation: 'get',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error("Error fetching session data:", serverError);
            toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la sesión." });
        }
         router.push('/gym');
      } finally {
        setSessionLoading(false);
      }
    };

    fetchSessionData();
  }, [user, firestore, sessionId, router, toast]);

  const messagesQuery = useMemo(
    () => user?.uid && firestore && sessionId
        ? query(collection(firestore, `users/${user.uid}/gymSessions/${sessionId}/messages`), orderBy('timestamp', 'asc'))
        : undefined,
    [user, firestore, sessionId]
  );
  
  const { data: messages, loading: messagesLoading } = useCollection<Message>(messagesQuery);

  const appendMessage = useCallback(async (message: Omit<Message, 'id'>) => {
    if (!user || !firestore || !sessionId) return;
    const messagesColRef = collection(firestore, `users/${user.uid}/gymSessions/${sessionId}/messages`);
    
    try {
        await addDoc(messagesColRef, message);
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: messagesColRef.path,
                operation: 'create',
                requestResourceData: message
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error("Error appending message:", serverError);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar tu mensaje." });
        }
    }
  }, [user, firestore, sessionId, toast]);

  const handleSendMessage = useCallback(async (input: string) => {
    if (!input.trim() || !user || !scenario) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: Timestamp.now(),
    };
    
    await appendMessage(userMessage);

    setIsResponding(true);
    try {
      // Use the latest messages from Firestore for context. Handle null case.
      const currentMessages = [...(messages || []), userMessage];
      const history = currentMessages.map(m => ({ role: m.role, content: m.content }));

      const aiResponseContent = await runSimulation({
        personaPrompt: scenario.personaPrompt,
        conversationHistory: history as any,
      });

      const aiMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: aiResponseContent,
        timestamp: Timestamp.now(),
      };
      await appendMessage(aiMessage);

    } catch (error) {
      console.error("Error in simulation response:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo obtener respuesta de la simulación." });
    } finally {
      setIsResponding(false);
    }
  }, [user, scenario, messages, appendMessage, toast]);
  
  const handleFinishSimulation = async () => {
    if (!user || !firestore || !sessionId || !scenario) return;
    
    setIsFinishing(true);
    const sessionRef = doc(firestore, `users/${user.uid}/gymSessions`, sessionId);
    let generatedFeedback = '';
    
    try {
        const transcript = (messages || []).map(m => `${m.role === 'user' ? 'Usuario' : 'Personaje'}: ${m.content}`).join('\n');
        
        const feedbackResult = await generateSimulationFeedback({
            scenarioTitle: scenario.title,
            scenarioDescription: scenario.description,
            simulationTranscript: transcript,
        });
        generatedFeedback = feedbackResult.feedback;
        setFeedback(generatedFeedback);
    } catch (error) {
      console.error("Error generating feedback:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el feedback." });
      setIsFinishing(false);
      return; // Stop if feedback generation fails
    }
    
    try {
        const updateData = {
            feedback: generatedFeedback,
            completedAt: serverTimestamp(),
        };
        await updateDoc(sessionRef, updateData);
        setShowFeedbackModal(true);
    } catch(serverError: any) {
         if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: sessionRef.path,
                operation: 'update',
                requestResourceData: { feedback: 'Generated by AI', completedAt: 'serverTimestamp' }
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error("Error updating session with feedback:", serverError);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el feedback." });
        }
    } finally {
      setIsFinishing(false);
    }
  };

  if (sessionLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-14 items-center justify-between p-2 md:p-4 border-b shrink-0 bg-background z-10">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/gym')}>
              <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-base md:text-lg font-semibold truncate">
            {scenario?.title || 'Simulación'}
          </h2>
        </div>
        <Button onClick={handleFinishSimulation} disabled={isFinishing || !!feedback}>
          {isFinishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {feedback ? 'Ver Feedback' : 'Finalizar y Obtener Feedback'}
        </Button>
      </header>

      {messages && messages.length === 0 && !messagesLoading && (
        <Alert className="m-4 max-w-2xl mx-auto">
            <Bot className="h-4 w-4" />
            <AlertTitle>¡Estás en el Gimnasio Emocional!</AlertTitle>
            <AlertDescription>
                Has iniciado una simulación. El asistente de IA ya no es Nimbus, ahora está interpretando un personaje. Empieza la conversación cuando quieras.
            </AlertDescription>
        </Alert>
      )}

      <div className="flex-1 overflow-y-auto">
        <ChatMessages messages={messages || []} isResponding={isResponding || messagesLoading} />
      </div>

      <div className="mt-auto px-2 py-4 md:px-4 md:py-4 border-t bg-background/95 backdrop-blur-sm">
        {feedback ? (
          <div className="text-center">
             <Button onClick={() => setShowFeedbackModal(true)}>
                Ver Feedback de Nuevo
            </Button>
          </div>
        ) : (
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isResponding || messagesLoading}
            chatHistory={messages || []}
          />
        )}
      </div>

      {/* Feedback Modal */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Feedback de la Simulación</DialogTitle>
            <DialogDescription>
              Análisis de tu desempeño en el escenario: "{scenario?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-1 pr-4">
            {feedback ? (
                <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown>{feedback}</ReactMarkdown>
                </div>
            ) : (
              <Skeleton className="h-48 w-full" />
            )}
          </div>
           <DialogFooter>
            <Button onClick={() => setShowFeedbackModal(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default memo(SimulationPage);

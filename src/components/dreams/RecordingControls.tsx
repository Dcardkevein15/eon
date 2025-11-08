
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Mic, Square, Pause, Play, Trash2, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type RecordingStatus = 'idle' | 'listening' | 'recording' | 'paused' | 'transcribing' | 'done' | 'processing' | 'speaking' | 'initializing';

interface RecordingControlsProps {
    status: RecordingStatus;
    onStart: () => void;
    onPause: () => void;
    onResume: () => void;
    onStop: () => void;
    onClear: () => void;
}

const iconVariants = {
  hidden: { scale: 0.5, opacity: 0, rotate: -45 },
  visible: { scale: 1, opacity: 1, rotate: 0 },
  exit: { scale: 0.5, opacity: 0, rotate: 45 },
};

const MotionButton = motion(Button);

export default function RecordingControls({ status, onStart, onPause, onResume, onStop, onClear }: RecordingControlsProps) {

  const renderMainButton = () => {
    const disabled = status === 'processing' || status === 'speaking' || status === 'initializing' || status === 'transcribing';

    switch (status) {
      case 'idle':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
                <MotionButton
                    type="button"
                    key="start"
                    variants={iconVariants}
                    initial="hidden" animate="visible" exit="exit"
                    className="h-16 w-16 rounded-full bg-blue-500 text-white hover:bg-blue-600 shadow-lg transform transition-transform duration-200 hover:scale-110"
                    size="icon"
                    onClick={onStart}
                    disabled={disabled}
                >
                    <Mic className="h-7 w-7" />
                </MotionButton>
            </TooltipTrigger>
            <TooltipContent><p>Empezar a Grabar</p></TooltipContent>
          </Tooltip>
        );
      case 'recording':
      case 'listening':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
                 <MotionButton
                    type="button"
                    key="pause"
                    variants={iconVariants}
                    initial="hidden" animate="visible" exit="exit"
                    className="h-16 w-16 rounded-full bg-amber-500 text-white hover:bg-amber-600 shadow-lg transform transition-transform duration-200 hover:scale-110"
                    size="icon"
                    onClick={onPause}
                    disabled={disabled}
                >
                    <Pause className="h-7 w-7" />
                </MotionButton>
            </TooltipTrigger>
             <TooltipContent><p>Pausar Grabación</p></TooltipContent>
          </Tooltip>
        );
      case 'paused':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
                 <MotionButton
                    type="button"
                    key="resume"
                    variants={iconVariants}
                    initial="hidden" animate="visible" exit="exit"
                    className="h-16 w-16 rounded-full bg-blue-500 text-white hover:bg-blue-600 shadow-lg transform transition-transform duration-200 hover:scale-110"
                    size="icon"
                    onClick={onResume}
                    disabled={disabled}
                >
                    <Play className="h-7 w-7" />
                </MotionButton>
            </TooltipTrigger>
            <TooltipContent><p>Reanudar Grabación</p></TooltipContent>
          </Tooltip>
        );
       case 'transcribing':
       case 'processing':
       case 'speaking':
       case 'initializing':
        return (
            <MotionButton
                disabled
                type="button"
                key="processing"
                variants={iconVariants}
                initial="hidden" animate="visible" exit="exit"
                className="h-16 w-16 rounded-full"
                size="icon"
            >
                <Loader2 className="h-7 w-7 animate-spin" />
            </MotionButton>
        );
      case 'done':
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <MotionButton
                        type="button"
                        key="clear"
                        variants={iconVariants}
                        initial="hidden" animate="visible" exit="exit"
                        className="h-16 w-16 rounded-full bg-destructive text-white hover:bg-destructive/90 shadow-lg"
                        size="icon"
                        onClick={onClear}
                        disabled={disabled}
                    >
                        <Trash2 className="h-7 w-7" />
                    </MotionButton>
                </TooltipTrigger>
                <TooltipContent><p>Limpiar Grabación</p></TooltipContent>
            </Tooltip>
        );
      default:
        return null;
    }
  };

  const renderStopButton = () => {
    if(status === 'listening' || status === 'paused' || status === 'recording') {
       return (
         <Tooltip>
            <TooltipTrigger asChild>
                <MotionButton
                    type="button"
                    key="stop"
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 50 }}
                    className="absolute -bottom-24 h-14 w-14 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-md"
                    size="icon"
                    onClick={onStop}
                >
                    <Square className="h-6 w-6" />
                </MotionButton>
            </TooltipTrigger>
            <TooltipContent><p>Finalizar Grabación</p></TooltipContent>
         </Tooltip>
       )
    }
    return null;
  }

  return (
    <TooltipProvider>
      <div className="relative flex items-center justify-center h-16 w-16">
         <AnimatePresence mode="wait">
            {renderMainButton()}
        </AnimatePresence>
        <AnimatePresence>
            {renderStopButton()}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}

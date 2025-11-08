
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Mic, Square, Pause, Play, Trash2, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type RecordingStatus = 'idle' | 'listening' | 'paused' | 'processing' | 'speaking' | 'done' | 'initializing';

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
    const disabled = status === 'processing' || status === 'speaking' || status === 'initializing';

    switch (status) {
      case 'idle':
      case 'done':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
                <MotionButton
                    type="button"
                    key="start"
                    variants={iconVariants}
                    initial="hidden" animate="visible" exit="exit"
                    className="h-20 w-20 rounded-full bg-blue-500 text-white hover:bg-blue-600 shadow-lg transform transition-transform duration-200 hover:scale-110"
                    size="icon"
                    onClick={onStart}
                    disabled={disabled}
                >
                    <Mic className="h-8 w-8" />
                </MotionButton>
            </TooltipTrigger>
            <TooltipContent><p>Empezar a hablar</p></TooltipContent>
          </Tooltip>
        );
      case 'listening':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
                 <MotionButton
                    type="button"
                    key="pause"
                    variants={iconVariants}
                    initial="hidden" animate="visible" exit="exit"
                    className="h-20 w-20 rounded-full bg-amber-500 text-white hover:bg-amber-600 shadow-lg transform transition-transform duration-200 hover:scale-110"
                    size="icon"
                    onClick={onPause}
                    disabled={disabled}
                >
                    <Pause className="h-8 w-8" />
                </MotionButton>
            </TooltipTrigger>
             <TooltipContent><p>Pausar</p></TooltipContent>
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
                    className="h-20 w-20 rounded-full bg-blue-500 text-white hover:bg-blue-600 shadow-lg transform transition-transform duration-200 hover:scale-110"
                    size="icon"
                    onClick={onResume}
                    disabled={disabled}
                >
                    <Play className="h-8 w-8" />
                </MotionButton>
            </TooltipTrigger>
            <TooltipContent><p>Reanudar</p></TooltipContent>
          </Tooltip>
        );
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
                className="h-20 w-20 rounded-full"
                size="icon"
            >
                <Loader2 className="h-8 w-8 animate-spin" />
            </MotionButton>
        );
      default:
        return null;
    }
  };

  const renderStopButton = () => {
    if(status === 'listening' || status === 'paused') {
       return (
         <Tooltip>
            <TooltipTrigger asChild>
                <MotionButton
                    type="button"
                    key="stop"
                    layout
                    initial={{ opacity: 0, scale: 0.8, x: 50 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 50 }}
                    className="h-16 w-16 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-md"
                    size="icon"
                    onClick={onStop}
                >
                    <Square className="h-7 w-7" />
                </MotionButton>
            </TooltipTrigger>
            <TooltipContent><p>Finalizar conversación</p></TooltipContent>
         </Tooltip>
       )
    }
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-4">
         <AnimatePresence>
            {renderStopButton()}
        </AnimatePresence>
         <AnimatePresence mode="wait">
            {renderMainButton()}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}


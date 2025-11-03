
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Mic, Square, Pause, Play, Trash2, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type RecordingStatus = 'idle' | 'recording' | 'paused' | 'transcribing' | 'done';

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
                    className="h-8 w-8 rounded-full bg-primary/20 text-primary hover:bg-primary/30"
                    size="icon"
                    onClick={onStart}
                >
                    <Mic className="h-5 w-5" />
                </MotionButton>
            </TooltipTrigger>
            <TooltipContent><p>Empezar a grabar</p></TooltipContent>
          </Tooltip>
        );
      case 'recording':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
                 <MotionButton
                    type="button"
                    key="pause"
                    variants={iconVariants}
                    initial="hidden" animate="visible" exit="exit"
                    className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                    size="icon"
                    onClick={onPause}
                >
                    <Pause className="h-5 w-5" />
                </MotionButton>
            </TooltipTrigger>
             <TooltipContent><p>Pausar grabación</p></TooltipContent>
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
                    className="h-8 w-8 rounded-full bg-primary/20 text-primary hover:bg-primary/30"
                    size="icon"
                    onClick={onResume}
                >
                    <Play className="h-5 w-5" />
                </MotionButton>
            </TooltipTrigger>
            <TooltipContent><p>Reanudar grabación</p></TooltipContent>
          </Tooltip>
        );
      case 'transcribing':
        return (
            <MotionButton
                disabled
                type="button"
                key="transcribing"
                variants={iconVariants}
                initial="hidden" animate="visible" exit="exit"
                className="h-8 w-8 rounded-full"
                size="icon"
                variant="ghost"
            >
                <Loader2 className="h-5 w-5 animate-spin" />
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
                            className="h-8 w-8 rounded-full bg-destructive/20 text-destructive hover:bg-destructive/30"
                            size="icon"
                            onClick={onClear}
                        >
                            <Trash2 className="h-5 w-5" />
                        </MotionButton>
                    </TooltipTrigger>
                    <TooltipContent><p>Eliminar grabación</p></TooltipContent>
                </Tooltip>
            )
      default:
        return null;
    }
  };

  const renderStopButton = () => {
    if(status === 'recording' || status === 'paused') {
       return (
         <Tooltip>
            <TooltipTrigger asChild>
                <MotionButton
                    type="button"
                    key="stop"
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="h-8 w-8 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500/30"
                    size="icon"
                    onClick={onStop}
                >
                    <Square className="h-5 w-5" />
                </MotionButton>
            </TooltipTrigger>
            <TooltipContent><p>Finalizar grabación</p></TooltipContent>
         </Tooltip>
       )
    }
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
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

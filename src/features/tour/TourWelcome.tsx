'use client';

import { motion } from 'framer-motion';
import { AppLogo } from '@/components/logo';

const sentence = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.5,
      staggerChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.5,
    },
  },
};

const letter = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 12,
      stiffness: 200,
    },
  },
};

const line1 = "Bienvenido a Nimbus.";
const line2 = "Tu espacio seguro para el autodescubrimiento y el bienestar emocional.";
const line3 = "Prepárate para un recorrido que transformará tu perspectiva.";

interface TourWelcomeProps {
    onComplete: () => void;
}

const TourWelcome: React.FC<TourWelcomeProps> = ({ onComplete }) => {
  return (
    <motion.div 
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background"
        initial="hidden"
        animate="visible"
        exit="exit"
        onAnimationComplete={(definition) => {
            if (definition === 'visible') {
                setTimeout(onComplete, 5500); // Wait for text animation + pause
            }
        }}
    >
        <motion.div
             variants={sentence}
             className='text-center p-4'
        >
            <motion.div 
                className="mb-8"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1, transition: { duration: 1, delay: 0.2 } }}
            >
                <AppLogo className="w-24 h-24 mx-auto" />
            </motion.div>
            
            <motion.h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
                {line1.split("").map((char, index) => (
                    <motion.span key={`${char}-${index}`} variants={letter}>
                        {char}
                    </motion.span>
                ))}
            </motion.h1>
            <motion.p 
                className="text-md md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 2, duration: 1 } }}
            >
                {line2}
            </motion.p>
            <motion.p 
                className="text-lg md:text-2xl text-primary font-semibold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 3.5, duration: 1 } }}
            >
                 {line3}
            </motion.p>
        </motion.div>
    </motion.div>
  );
};

export default TourWelcome;

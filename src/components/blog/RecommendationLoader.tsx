'use client';

import { motion } from 'framer-motion';
import { Hammer, Zap, GitCommitVertical } from 'lucide-react';

const ForgeAnvil = () => (
    <svg width="60" height="40" viewBox="0 0 60 40" fill="hsl(var(--muted-foreground))" className="drop-shadow-lg">
        <path d="M5 15 H55 C 58 15 58 20 55 20 H5 V15 Z" />
        <path d="M10 20 V35 H50 V20 Z" />
        <path d="M0 10 H10 V15 H0 Z" />
    </svg>
)

export default function RecommendationLoader() {

    const sparkVariants = {
        hidden: { opacity: 0, y: -20 },
        visible: (i: number) => ({
            opacity: [0, 1, 0],
            y: 40,
            x: Math.random() * 40 - 20,
            scale: Math.random() * 0.5 + 0.5,
            transition: {
                delay: i * 0.02 + 0.5,
                duration: 0.8,
                ease: 'easeOut',
            }
        })
    };

    const hammerVariants = {
        rest: { rotate: -20, y: -80, x: 40, opacity: 0 },
        strike: {
            rotate: [45, -10],
            y: 25,
            x: 0,
            opacity: 1,
            transition: {
                duration: 0.3,
                ease: 'easeIn',
                delay: 1.5,
            }
        },
    };
    
    const flashVariants = {
        hidden: { scale: 0, opacity: 0 },
        visible: {
            scale: [0, 25],
            opacity: [0, 1, 0.5, 0],
            transition: {
                delay: 1.8,
                duration: 0.5,
                ease: 'easeOut',
            }
        }
    }

    const orbVariants = {
        hidden: { scale: 0, opacity: 0 },
        visible: {
            scale: 1,
            opacity: 1,
            transition: {
                delay: 2.2,
                duration: 0.5,
            }
        },
        pulse: {
            scale: [1, 1.1, 1],
            boxShadow: [
                "0 0 0 0 hsl(var(--primary) / 0.7)",
                "0 0 20px 30px hsl(var(--primary) / 0)",
                "0 0 0 0 hsl(var(--primary) / 0)",
            ],
            transition: {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
            }
        }
    }


    return (
        <div className="relative w-full h-48 bg-card/80 rounded-xl overflow-hidden flex items-center justify-center border-2 border-dashed border-border/50">
            {/* Sparks */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24">
                {[...Array(30)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 50}%`,
                        }}
                        variants={sparkVariants}
                        initial="hidden"
                        animate="visible"
                        custom={i}
                    >
                        <div className="w-1 h-1 bg-amber-400 rounded-full" />
                    </motion.div>
                ))}
            </div>

            {/* Anvil */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute"
            >
                <ForgeAnvil />
            </motion.div>

            {/* Hammer */}
            <motion.div
                variants={hammerVariants}
                initial="rest"
                animate="strike"
                className="absolute"
            >
                <Hammer className="w-16 h-16 text-slate-300 -scale-x-100" />
            </motion.div>

            {/* Flash */}
            <motion.div
                variants={flashVariants}
                initial="hidden"
                animate="visible"
                className="absolute w-2 h-2 rounded-full bg-primary"
            />
            
            {/* Orb */}
            <motion.div
                variants={orbVariants}
                initial="hidden"
                animate={["visible", "pulse"]}
                className="absolute w-8 h-8 bg-primary rounded-full"
            />
            
        </div>
    );
}

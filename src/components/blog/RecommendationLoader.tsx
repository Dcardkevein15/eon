'use client';

import { motion } from 'framer-motion';
import { Hammer } from 'lucide-react';
import { useEffect, useState } from 'react';

const ForgeAnvil = () => (
    <svg width="60" height="40" viewBox="0 0 60 40" fill="hsl(var(--muted-foreground))" className="drop-shadow-lg">
        <path d="M5 15 H55 C 58 15 58 20 55 20 H5 V15 Z" />
        <path d="M10 20 V35 H50 V20 Z" />
        <path d="M0 10 H10 V15 H0 Z" />
    </svg>
)

type Spark = {
    id: number;
    left: string;
    top: string;
    duration: number;
    delay: number;
    x: number;
    y: number;
};

export default function RecommendationLoader() {
    const [sparks, setSparks] = useState<Spark[]>([]);

    useEffect(() => {
        // Generate spark positions only on the client-side after hydration
        const newSparks = Array.from({ length: 15 }).map((_, i) => ({
            id: i,
            left: '50%',
            top: '50%',
            duration: Math.random() * 0.6 + 0.4, // 0.4s to 1.0s
            delay: i * (1.2 / 15), // Stagger the start of each spark over the hammer cycle
            x: (Math.random() - 0.5) * 150, // Horizontal spread
            y: -(Math.random() * 80 + 20), // Upward motion
        }));
        setSparks(newSparks);
    }, []); 

    const hammerVariants = {
        strike: {
            rotate: [15, -10],
            y: [0, 25],
            x: [20, 0],
            transition: {
                duration: 0.3,
                ease: 'easeIn',
                repeat: Infinity,
                repeatType: "reverse",
                repeatDelay: 0.6,
            }
        },
    };
    
    const shockwaveVariants = {
        expand: {
            scale: [0, 15],
            opacity: [0, 0.5, 0],
            transition: {
                duration: 1.2,
                ease: 'easeOut',
                repeat: Infinity,
            }
        }
    };

    const sparkVariants = {
        fly: (spark: Spark) => ({
            x: spark.x,
            y: spark.y,
            opacity: [0, 1, 1, 0],
            scale: [0, 1, 1, 0],
            transition: {
                duration: spark.duration,
                delay: spark.delay,
                repeat: Infinity,
                repeatDelay: 1.2 - spark.duration, // Ensure it syncs with the overall cycle
                ease: "easeOut",
            }
        })
    };


    return (
        <div className="relative w-full h-48 bg-card/80 rounded-xl overflow-hidden flex items-center justify-center border-2 border-dashed border-border/50">
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
                animate="strike"
                className="absolute"
                style={{ originX: '100%', originY: '100%' }}
            >
                <Hammer className="w-16 h-16 text-slate-300 -scale-x-100" />
            </motion.div>

            {/* Shockwave on impact */}
            <motion.div
                className="absolute w-4 h-4 rounded-full border-2 border-primary"
                variants={shockwaveVariants}
                animate="expand"
            />

            {/* Sparks on impact */}
             <div className="absolute">
                {sparks.map((spark) => (
                    <motion.div
                        key={spark.id}
                        className="absolute w-1 h-1 bg-amber-400 rounded-full"
                        variants={sparkVariants}
                        custom={spark}
                        animate="fly"
                    />
                ))}
            </div>
            
        </div>
    );
}

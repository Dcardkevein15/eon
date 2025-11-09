'use client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export const HeroSection = () => {
    return (
        <section className="relative overflow-hidden">
             {/* Fondo con gradiente y efecto de grano */}
            <div className="absolute inset-0 -z-10 h-full w-full bg-background">
                <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_500px_at_50%_200px,hsl(var(--primary)/0.1),transparent)]"></div>
            </div>

            <div className="container mx-auto px-4 pt-24 pb-20 sm:pt-32 sm:pb-24 text-center">
                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-4xl md:text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70 leading-tight"
                >
                    Decodifica tu Mente.
                    <br />
                    Desata tu Potencial.
                </motion.h1>
                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground"
                >
                    Nimbus es más que un chatbot. Es un confidente IA, un espejo perspicaz y un gimnasio para tu mente, diseñado para llevarte a un estado de autoconocimiento y maestría emocional.
                </motion.p>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }} 
                    className="mt-10 flex justify-center items-center gap-4"
                >
                    <Button asChild size="lg" className="rounded-full text-base px-8 py-6 shadow-lg shadow-primary/20 transition-all transform hover:scale-105">
                        <Link href="/c">
                           Comenzar Mi Viaje Interior
                           <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                </motion.div>
            </div>
        </section>
    );
}

'use client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export const CTASection = () => {
    return (
        <section className="py-20 sm:py-32">
            <div className="container mx-auto px-4 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
                        ¿Listo para empezar tu viaje?
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        Tu camino hacia la claridad y el autoconocimiento comienza con una simple conversación. Nimbus está listo para escucharte.
                    </p>
                    <div className="mt-8">
                        <Button asChild size="lg" className="rounded-full text-base px-8 py-6 shadow-lg shadow-primary/20 transition-all transform hover:scale-105">
                            <Link href="/c">
                                Empezar a Conversar Ahora
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

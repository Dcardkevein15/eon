'use client';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TwoColumnFeatureProps {
    title: string;
    subtitle: string;
    description: string;
    imageUrl: string;
    imageHint: string;
    ctaText: string;
    ctaLink: string;
    reverse?: boolean;
}

export const TwoColumnFeature = ({ title, subtitle, description, imageUrl, imageHint, ctaText, ctaLink, reverse = false }: TwoColumnFeatureProps) => {
    
    const textVariants = {
        offscreen: { opacity: 0, x: reverse ? 50 : -50 },
        onscreen: {
            opacity: 1,
            x: 0,
            transition: { duration: 0.6, ease: "easeOut" }
        }
    };
    
    const imageVariants = {
        offscreen: { opacity: 0, scale: 0.9 },
        onscreen: {
            opacity: 1,
            scale: 1,
            transition: { duration: 0.6, ease: "easeOut", delay: 0.2 }
        }
    };

    return (
        <section className="py-20 sm:py-24">
            <div className="container mx-auto px-4">
                <div className={cn(
                    "grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center",
                    reverse && "md:grid-flow-col-dense"
                )}>
                    <motion.div
                        initial="offscreen"
                        whileInView="onscreen"
                        viewport={{ once: true, amount: 0.5 }}
                        variants={imageVariants}
                        className={cn(reverse && "md:col-start-2")}
                    >
                        <Image
                            src={imageUrl}
                            alt={title}
                            width={800}
                            height={600}
                            data-ai-hint={imageHint}
                            className="rounded-xl shadow-2xl object-cover"
                        />
                    </motion.div>
                    <motion.div
                         initial="offscreen"
                         whileInView="onscreen"
                         viewport={{ once: true, amount: 0.5 }}
                         variants={textVariants}
                         className={cn(reverse && "md:col-start-1")}
                    >
                        <p className="text-sm font-bold uppercase tracking-wider text-primary mb-2">{subtitle}</p>
                        <h3 className="text-3xl font-bold tracking-tight mb-4">{title}</h3>
                        <p className="text-muted-foreground text-lg leading-relaxed mb-8">{description}</p>
                        <Button asChild variant="outline" size="lg">
                            <Link href={ctaLink}>
                                {ctaText}
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

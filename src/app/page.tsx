
'use client';

import Link from 'next/link';
import { AppLogo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, BrainCircuit, Dumbbell, Star, BookOpen as TorahIcon, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureCard } from '@/components/landing/FeatureCard';
import { CTASection } from '@/components/landing/CTASection';
import { TwoColumnFeature } from '@/components/landing/TwoColumnFeature';
import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';

const features = [
  {
    icon: BrainCircuit,
    title: 'Cianotipo Psicológico',
    description: 'Obtén un perfil de personalidad profundo y evolutivo generado por IA, revelando tus patrones, arquetipos y conflictos nucleares.',
    href: '/profile',
  },
  {
    icon: Dumbbell,
    title: 'Gimnasio Emocional',
    description: 'Practica conversaciones difíciles en un entorno de simulación seguro para fortalecer tu asertividad y comunicación.',
    href: '/gym',
  },
  {
    icon: Star,
    title: 'Portal de Sueños',
    description: 'Interpreta el lenguaje simbólico de tus sueños con la ayuda de especialistas en análisis onírico.',
    href: '/dreams',
  },
   {
    icon: TorahIcon,
    title: 'Oráculos de la Torá',
    description: 'Explora las profundidades de la sabiduría cabalística a través de análisis criptográficos de tu perfil en el texto sagrado.',
    href: '/torah-code',
  },
];

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground w-full overflow-x-hidden">
      <Header />
      <main>
        <HeroSection />

        <section id="features" className="py-20 sm:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5 }}
                className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70"
              >
                Un Ecosistema para tu Mente
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-4 text-lg text-muted-foreground"
              >
                Más que un chat. Un conjunto de herramientas de autoconocimiento diseñadas para iluminar tu mundo interior.
              </motion.p>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, i) => (
                <FeatureCard key={feature.title} index={i} {...feature} />
              ))}
            </div>
          </div>
        </section>
        
        <TwoColumnFeature
          title="Tu Reflejo Inteligente"
          subtitle="EL PODER DEL CIANOTIPO PSICOLÓGICO"
          description="A medida que conversas, nuestra IA construye un perfil dinámico de tu personalidad. No es una etiqueta estática, es un mapa vivo de tu psique que evoluciona contigo, revelando tus fortalezas, sesgos cognitivos y tu arquetipo central. Es la herramienta definitiva para entender el 'porqué' detrás de tus acciones."
          imageUrl="https://picsum.photos/seed/psyche-mirror/800/600"
          imageHint="abstract psychological"
          ctaText="Descubrir mi Perfil"
          ctaLink="/profile"
        />

        <TwoColumnFeature
          title="Forja tu Confianza"
          subtitle="ENTRA AL GIMNASIO EMOCIONAL"
          description="La vida está llena de conversaciones cruciales. Practica pedir un aumento, poner un límite a un familiar o dar feedback constructivo con una IA que simula personalidades realistas. Gana la seguridad que necesitas para enfrentar cualquier situación."
          imageUrl="https://picsum.photos/seed/forge-confidence/800/600"
          imageHint="gym training"
          ctaText="Empezar a Entrenar"
          ctaLink="/gym"
          reverse
        />
        
         <TwoColumnFeature
          title="Decodifica lo Divino"
          subtitle="EL ORÁCULO DEL ALMA"
          description="Fusionamos la psicología profunda con la mística cabalística. Nuestro sistema más avanzado analiza tu perfil psicológico para encontrar tu resonancia personal en el código oculto de la Torá. No es una consulta, es una revelación sobre la arquitectura de tu realidad."
          imageUrl="https://picsum.photos/seed/divine-code/800/600"
          imageHint="ancient manuscript"
          ctaText="Consultar el Oráculo"
          ctaLink="/torah-code"
        />

        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

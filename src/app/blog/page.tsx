'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BrainCircuit, Heart, Users, GitMerge, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

const categories = [
  {
    name: 'Terapia Cognitivo-Conductual',
    slug: 'terapia-cognitivo-conductual',
    description: 'Reestructura tus patrones de pensamiento y comportamiento.',
    icon: BrainCircuit,
    color: 'from-blue-400 to-blue-600',
  },
  {
    name: 'Ansiedad y Estrés',
    slug: 'ansiedad-y-estres',
    description: 'Encuentra la calma y aprende a manejar la presión.',
    icon: GitMerge,
    color: 'from-yellow-400 to-yellow-600',
  },
  {
    name: 'Mindfulness y Aceptación',
    slug: 'mindfulness-y-aceptacion',
    description: 'Vive en el presente y acepta tus pensamientos sin juicio.',
    icon: Sun,
    color: 'from-purple-400 to-purple-600',
  },
  {
    name: 'Relaciones Interpersonales',
    slug: 'relaciones-interpersonales',
    description: 'Mejora tus vínculos con los demás y contigo mismo.',
    icon: Users,
    color: 'from-green-400 to-green-600',
  },
  {
    name: 'Salud Emocional',
    slug: 'salud-emocional',
    description: 'Navega por tus emociones y construye resiliencia.',
    icon: Heart,
    color: 'from-red-400 to-red-600',
  },
  {
    name: 'Crecimiento Personal',
    slug: 'crecimiento-personal',
    description: 'Desbloquea tu potencial y define tu camino.',
    icon: Moon,
    color: 'from-indigo-400 to-indigo-600',
  },
];

export default function BlogCategoriesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-12">
           <Button asChild variant="ghost" className="-ml-4 text-muted-foreground hover:bg-accent/10 hover:text-foreground">
            <Link href="/">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Volver al Inicio
            </Link>
          </Button>
          <div className="mt-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-chart-5 via-chart-1 to-chart-2">
              Explora Nuestro Conocimiento
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Sumérgete en artículos generados por IA, diseñados para ofrecerte claridad y herramientas prácticas en tu viaje de autoconocimiento.
            </p>
          </div>
        </header>

        <motion.div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
        >
          {categories.map((category) => (
            <motion.div
              key={category.slug}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <Link href={`/blog/${category.slug}`} passHref>
                <div className="h-full block group relative overflow-hidden rounded-xl border border-border bg-card/50 p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10">
                   <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:opacity-20 group-hover:scale-125 transition-all duration-500">
                     <category.icon className="w-32 h-32" />
                  </div>
                  <div className="relative z-10">
                    <div className={`mb-4 inline-block rounded-lg bg-gradient-to-br ${category.color} p-3`}>
                      <category.icon className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">{category.name}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
                    <div className="mt-4 flex items-center text-xs font-semibold text-primary/80 transition-colors group-hover:text-primary">
                      <span>Explorar Categoría</span>
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export type TourStep = {
  selector: string;
  title: string;
  content: string;
};

export const tourSteps: Record<string, TourStep[]> = {
  main: [
    {
      selector: '#new-chat-button',
      title: 'Inicia tu Conversación',
      content: 'Haz clic aquí para comenzar una nueva conversación con tu asistente de IA. Es el primer paso para explorar tus pensamientos y sentimientos.',
    },
    {
      selector: '#profile-nav',
      title: 'Tu Perfil Psicológico',
      content: 'Aquí, la IA genera un análisis profundo basado en tus conversaciones. Descubre patrones, fortalezas y áreas de crecimiento. ¡Es tu mapa personal!',
    },
    {
      selector: '#gym-nav',
      title: 'Gimnasio Emocional',
      content: 'Practica conversaciones difíciles en un entorno seguro. Elige un escenario y ensaya tus habilidades de comunicación sin miedo a equivocarte.',
    },
    {
      selector: '#dreams-nav',
      title: 'Portal de Sueños',
      content: 'Descifra los mensajes de tu subconsciente. Narra o escribe tus sueños y deja que la IA te ofrezca interpretaciones desde diferentes perspectivas.',
    },
    {
      selector: '#chat-input-area',
      title: 'Tu Espacio para Escribir',
      content: 'Este es tu lienzo. Escribe lo que sientes, haz preguntas o simplemente desahógate. También puedes usar el micrófono para enviar mensajes de voz.',
    },
  ],
  profile: [
    {
        selector: 'header h1',
        title: 'Tu Dashboard de Autoconocimiento',
        content: 'Este es tu "Cianotipo Psicológico". Un perfil profundo generado por IA que evoluciona contigo, basado en tus conversaciones. No es un diagnóstico, sino un espejo para tu autoconocimiento.',
    },
    {
        selector: 'button[role="tab"][data-state="active"]',
        title: 'Navegación por Pestañas',
        content: 'Puedes explorar tu perfil desde diferentes ángulos: un resumen general, métricas visuales como tu evolución emocional, o un análisis profundo de tu personalidad.',
    },
    {
        selector: 'div.grid.md\\:grid-cols-2.gap-6',
        title: 'Arquetipo y Conflicto Nuclear',
        content: 'Aquí se identifica tu patrón de comportamiento principal (tu arquetipo) y la tensión interna más importante que la IA ha detectado en tus conversaciones.',
    },
    {
        selector: 'div.grid.sm\\:grid-cols-2.md\\:grid-cols-4.gap-4',
        title: 'El Bucle del Hábito',
        content: 'Este es el descubrimiento más poderoso. Muestra un patrón recurrente de Disparador -> Pensamiento -> Acción -> Resultado. Identificarlo es el primer paso para cambiarlo. ¡Puedes generar un ejercicio personalizado para romperlo!',
    },
    {
        selector: 'button:has(svg.lucide-refresh-ccw)',
        title: 'Actualiza tu Perfil',
        content: 'Si este botón aparece, significa que has tenido nuevas conversaciones. Haz clic para que la IA regenere el perfil con la información más reciente y descubras cómo has evolucionado.',
    }
  ],
  gym: [
      {
          selector: '.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.gap-6',
          title: 'Escenarios de Práctica',
          content: 'Aquí encontrarás diversas situaciones de la vida real para practicar. Elige una que te resulte desafiante, como pedir un aumento o poner un límite a un familiar.',
      },
      {
          selector: 'button:has(svg.lucide-arrow-right)',
          title: 'Iniciar Simulación',
          content: 'Una vez que elijas un escenario, haz clic en este botón. Se creará una nueva sesión de práctica donde interactuarás con un personaje de IA.',
      },
      {
          selector: 'h2:contains("Continuar Práctica")',
          title: 'Sesiones Activas',
          content: 'Las simulaciones que inicies aparecerán aquí. Tienen un tiempo limitado para ser completadas. Puedes retomarlas en cualquier momento antes de que expiren.',
      }
  ],
  dreams: [
      {
          selector: '.w-full.max-w-2xl.mx-auto.text-center.space-y-8',
          title: 'El Lienzo Onírico',
          content: 'Este es tu espacio para capturar tus sueños. No te preocupes por la estructura, simplemente escribe o narra todos los detalles que recuerdes, por extraños que parezcan.',
      },
      {
          selector: 'button:has(svg.lucide-mic)',
          title: 'Narrar tu Sueño',
          content: 'Si prefieres hablar a escribir, usa esta función. La IA transcribirá tu voz, permitiéndote capturar la atmósfera del sueño de una forma más fluida y natural.',
      },
      {
          selector: 'button:has(svg.lucide-wand-2)',
          title: 'Elegir Especialista',
          content: 'Una vez que hayas descrito tu sueño, el siguiente paso es elegir un "Guía Onírico". Cada uno ofrece una perspectiva de interpretación única y diferente.',
      },
      {
          selector: 'aside.w-80',
          title: 'Tu Diario de Sueños',
          content: 'Cada sueño que interpretes se guardará aquí. Puedes volver a visitar los análisis en cualquier momento para encontrar nuevos significados o ver patrones a lo largo del tiempo.',
      }
  ],
  marketplace: [
      {
          selector: 'aside.w-72',
          title: 'Filtros Inteligentes',
          content: 'Usa estos filtros para encontrar al terapeuta que mejor se adapte a tus necesidades. Puedes buscar por especialidad, idioma o rango de precios.',
      },
      {
          selector: '.grid.grid-cols-1.md\\:grid-cols-2.xl\\:grid-cols-3.gap-6',
          title: 'Profesionales Verificados',
          content: 'Explora nuestra lista de terapeutas. Cada tarjeta te da un resumen rápido de su perfil. El ícono de verificación azul te asegura que sus credenciales han sido confirmadas por nuestro equipo.',
      },
      {
          selector: 'button:contains("Ver Perfil")',
          title: 'Conoce a tu Terapeuta',
          content: 'Haz clic aquí para ver el perfil completo, leer su biografía, especialidades en detalle y, si eres administrador, editar su información.',
      }
  ],
  trading: [
      {
          selector: '.flex.items-center.gap-2.flex-wrap',
          title: 'Configuración del Análisis',
          content: 'Aquí seleccionas la criptomoneda que quieres analizar y el período de tiempo para los datos históricos. Tus elecciones determinarán el contexto del análisis de la IA.',
      },
      {
          selector: 'button:has(svg.lucide-play)',
          title: 'Iniciar Análisis',
          content: 'Una vez que estés listo, presiona este botón. Un equipo de analistas de IA especializados comenzará a debatir y procesar los datos para ti.',
      },
      {
          selector: 'div.lg\\:col-span-2',
          title: 'El Debate de la IA',
          content: 'Observa en tiempo real cómo dos personalidades de IA, Apex (Análisis Técnico) y Helios (Análisis Fundamental), presentan sus argumentos opuestos sobre el mercado.',
      },
      {
          selector: 'div.flex.flex-col.gap-6',
          title: 'Síntesis y Señales',
          content: 'Aquí es donde la magia ocurre. Un tercer agente de IA, "The Synthesizer", resume el debate y extrae señales de trading claras y accionables (Comprar, Vender, Mantener) basadas en las conclusiones.',
      }
  ]
};

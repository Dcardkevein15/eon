import { Placement } from '@popperjs/core';

export interface TourStep {
  selector: string;
  title: string;
  content: string;
  placement?: Placement;
}

export type TourKey = 'main' | 'chat' | 'profile' | 'gym' | 'dreams' | 'marketplace' | 'trading';

export const tourSteps: Record<TourKey, TourStep[]> = {
  main: [
    {
      selector: '#logo-section',
      title: 'Bienvenido a Nimbus',
      content: 'Esta es tu torre de control para el bienestar emocional. Desde aquí puedes acceder a todas las herramientas.',
      placement: 'right-start',
    },
    {
      selector: '#new-chat-button',
      title: 'Tu Espacio de Desahogo',
      content: 'Inicia una nueva conversación con tu psicólogo IA en cualquier momento. Es un espacio seguro y confidencial.',
      placement: 'right',
    },
    {
        selector: '#profile-nav',
        title: 'Tu Perfil Psicológico',
        content: 'La IA analiza tus conversaciones para crear un "mapa" de tu mente, revelando patrones, fortalezas y áreas de crecimiento.',
        placement: 'right',
    },
    {
        selector: '#gym-nav',
        title: 'Gimnasio Emocional',
        content: 'Practica conversaciones difíciles en simulaciones realistas para ganar confianza en situaciones de la vida real.',
        placement: 'right',
    },
     {
        selector: '#dreams-nav',
        title: 'Portal de Sueños',
        content: '¿Tuviste un sueño intrigante? Descríbelo aquí y deja que nuestros especialistas IA te ayuden a descifrar sus mensajes ocultos.',
        placement: 'right',
    },
    {
        selector: '#marketplace-nav',
        title: 'Marketplace de Terapeutas',
        content: 'Cuando estés listo para dar el siguiente paso, explora perfiles de terapeutas humanos verificados y agenda una sesión.',
        placement: 'right',
    },
    {
        selector: '#trading-nav',
        title: 'Análisis Pro de Trading',
        content: 'Una herramienta experimental que utiliza agentes de IA para analizar el mercado de criptomonedas y ofrecer perspectivas.',
        placement: 'right',
    },
    {
      selector: '#chat-input-container',
      title: 'El Corazón de la Conversación',
      content: 'Aquí es donde todo comienza. Escribe lo que sientes, haz preguntas o simplemente desahógate. No hay juicio.',
      placement: 'top-start',
    },
  ],
  chat: [
     {
      selector: '#chat-input-area',
      title: 'Tu Voz y Tus Palabras',
      content: 'Escribe aquí para comunicarte. También puedes usar el micrófono para enviar mensajes de voz que serán transcritos automáticamente.',
      placement: 'top',
    },
    // Añade aquí un paso dinámico para los botones de sugerencia cuando se implemente la lógica.
  ],
  profile: [
     {
      selector: '[data-tour-id="profile-diagnosis"]',
      title: 'Diagnóstico Descriptivo',
      content: 'Un resumen evolutivo de tu estado psicológico actual, basado en tus conversaciones más recientes.',
      placement: 'bottom',
    },
    {
      selector: '[data-tour-id="profile-archetype"]',
      title: 'Arquetipo Central',
      content: 'Identifica el patrón de personalidad dominante que estás manifestando, con sus luces y sombras.',
      placement: 'bottom',
    },
     {
      selector: '[data-tour-id="profile-habit-loop"]',
      title: 'El Bucle del Hábito',
      content: 'Revela un patrón de comportamiento recurrente (disparador, pensamiento, acción, resultado) para que puedas entenderlo y transformarlo.',
      placement: 'top',
    },
    {
      selector: '[data-tour-id="profile-metrics"]',
      title: 'Métricas Emocionales',
      content: 'Visualiza tu viaje emocional a lo largo del tiempo y explora la "constelación" de tus temas más importantes.',
      placement: 'bottom',
    },
  ],
  gym: [
     {
      selector: '[data-tour-id="gym-continue-practice"]',
      title: 'Continuar Práctica',
      content: 'Aquí encontrarás las simulaciones que has iniciado y aún no has completado. ¡Puedes retomarlas en cualquier momento!',
      placement: 'bottom',
    },
    {
      selector: '[data-tour-id="gym-new-simulation"]',
      title: 'Empezar Nueva Simulación',
      content: 'Elige uno de estos escenarios para practicar una conversación desafiante en un entorno seguro y controlado por la IA.',
      placement: 'bottom',
    },
  ],
  dreams: [
    {
      selector: '[data-tour-id="dream-input-area"]',
      title: 'Describe tu Sueño',
      content: 'Escribe o narra con el micrófono todos los detalles que recuerdes de tu sueño. No omitas nada, por extraño que parezca.',
      placement: 'bottom',
    },
    {
      selector: '[data-tour-id="dream-specialist-selection"]',
      title: 'Elige tu Guía Onírico',
      content: 'Cada especialista ofrece una perspectiva única para la interpretación. Elige el que más resuene contigo en este momento.',
      placement: 'top',
    },
     {
      selector: '[data-tour-id="dream-journal-sidebar"]',
      title: 'Diario de Sueños',
      content: 'Todas tus interpretaciones se guardan aquí, en tu dispositivo, para que puedas revisitarlas y encontrar patrones a lo largo del tiempo.',
      placement: 'right',
    },
  ],
  marketplace: [
    {
      selector: '[data-tour-id="marketplace-filters"]',
      title: 'Filtros de Búsqueda',
      content: 'Usa estos filtros para encontrar al terapeuta que mejor se ajuste a tus necesidades, especialidad, idioma y presupuesto.',
      placement: 'right',
    },
    {
      selector: '[data-tour-id="marketplace-list"]',
      title: 'Profesionales Verificados',
      content: 'Explora nuestra lista de terapeutas. Cada perfil ha sido revisado por nuestro equipo para garantizar su calidad y credenciales.',
      placement: 'bottom',
    },
  ],
   trading: [
    {
      selector: '[data-tour-id="trading-controls"]',
      title: 'Panel de Control',
      content: 'Selecciona la criptomoneda que deseas analizar y haz clic en "Iniciar Análisis" para que los agentes de IA comiencen su debate.',
      placement: 'bottom',
    },
    {
      selector: '[data-tour-id="trading-debate"]',
      title: 'Debate de Analistas IA',
      content: 'Aquí verás la discusión en tiempo real entre "Apex" (análisis técnico) y "Helios" (análisis fundamental).',
      placement: 'bottom',
    },
     {
      selector: '[data-tour-id="trading-synthesis"]',
      title: 'Síntesis y Señales',
      content: 'Un tercer agente, "The Synthesizer", resume el debate y genera señales de trading accionables basadas en las conclusiones.',
      placement: 'left',
    },
  ],
};

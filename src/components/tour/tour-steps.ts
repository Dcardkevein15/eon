export type TourStep = {
  selector: string;
  title: string;
  content: string;
};

export const tourSteps: TourStep[] = [
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
  {
    selector: '#start-tour-button',
    title: '¡Estás Listo!',
    content: 'Este ha sido un breve recorrido por las funciones principales. Si alguna vez necesitas recordar esto, simplemente haz clic en este botón para iniciar el tour de nuevo.',
  },
];

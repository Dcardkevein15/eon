export type TourStep = {
  targetId: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
};

export const tourSteps: TourStep[] = [
  {
    targetId: 'new-chat-button',
    title: 'Inicia tu Conversación',
    description: 'Haz clic aquí para empezar una nueva conversación. Es el primer paso para explorar tus pensamientos y emociones.',
    position: 'right',
  },
  {
    targetId: 'chat-input-area',
    title: 'Tu Espacio para Escribir',
    description: 'Usa esta área para escribir cómo te sientes, hacer preguntas o simplemente desahogarte. También puedes usar el micrófono para hablar.',
    position: 'top',
  },
  {
    targetId: 'history-header',
    title: 'Tu Historial de Chats',
    description: 'Aquí se guardarán todas tus conversaciones para que puedas revisarlas cuando quieras.',
    position: 'right',
  },
  {
    targetId: 'gym-nav',
    title: 'Gimnasio Emocional',
    description: '¿Necesitas practicar una conversación difícil? Este es un espacio seguro para ensayar con una IA antes de enfrentar el mundo real.',
    position: 'right',
  },
   {
    targetId: 'profile-nav',
    title: 'Tu Perfil Psicológico',
    description: 'Basado en tus conversaciones, la IA genera un "Cianotipo Psicológico" para ayudarte a entender tus patrones de pensamiento y emociones.',
    position: 'right',
  },
  {
    targetId: 'marketplace-nav',
    title: 'Marketplace de Terapeutas',
    description: 'Cuando estés listo para dar el siguiente paso, aquí puedes encontrar y conectar con terapeutas profesionales verificados.',
    position: 'right',
  },
];

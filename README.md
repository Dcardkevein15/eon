# NimbusChat - Asistente Psicológico Virtual

NimbusChat es una aplicación web construida con Next.js que funciona como un asistente virtual y psicólogo. Su objetivo principal es proporcionar un espacio seguro y anónimo para el desahogo emocional y el seguimiento del estado de ánimo, con la capacidad de ofrecer diagnósticos preliminares y recomendar profesionales cuando sea necesario.

## Tecnologías Utilizadas

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **Componentes UI**: [Shadcn/ui](https://ui.shadcn.com/)
- **Base de Datos y Autenticación**: [Firebase](https://firebase.google.com/) (Firestore y Authentication)
- **Inteligencia Artificial**: [Google AI & Genkit](https://firebase.google.com/docs/genkit)
- **Iconos**: [Lucide React](https://lucide.dev/)
- **Formularios**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

## Funcionalidades Principales

- **Chat en Tiempo Real**: Conversaciones fluidas con un asistente de IA empático.
- **Autenticación de Usuarios**: Inicio de sesión seguro con proveedores como Google.
- **Historial de Chats**: Todas las conversaciones se guardan de forma segura en Firestore.
- **Sugerencias Inteligentes**: La IA sugiere temas de conversación para romper el hielo.
- **Marketplace de Terapeutas**: Una sección para encontrar y contactar con psicólogos profesionales.
- **Manejo de Errores Contextual**: Sistema de errores detallado para facilitar la depuración.

## Cómo Empezar

Para levantar el proyecto en un entorno de desarrollo local, sigue estos pasos:

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/tu-repositorio.git
    cd tu-repositorio
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno:**
    Crea un archivo `.env.local` en la raíz del proyecto y añade las credenciales de tu proyecto de Firebase.

4.  **Ejecutar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación.

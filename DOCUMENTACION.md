# Riftbound - Documentación de la Aplicación

Este documento explica de forma detallada tanto el funcionamiento a nivel usuario (funcional) como la arquitectura interna (técnico) de la aplicación Riftbound.

## 1. Visión Funcional (¿Qué hace la aplicación?)

Riftbound es una aplicación web diseñada para los jugadores de un juego de cartas coleccionables. Sus principales funcionalidades son:

*   **Explorador de Cartas:** Permite visualizar todas las cartas disponibles en el juego. Se pueden aplicar múltiples filtros (coste, rareza, tipo, dominio) y realizar búsquedas por nombre para encontrar cartas específicas rápidamente.
*   **Gestor de Colección:** Los usuarios pueden llevar un registro de qué cartas poseen (tanto en su versión normal como "foil"/brillante). Permite importar la colección masivamente a través de un archivo CSV. Además, la aplicación muestra estadísticas como el porcentaje de completitud de la colección.
*   **Constructor de Mazos (Deck Builder):** Permite crear, editar y gestionar mazos de cartas. Valida reglas básicas y permite visualizar estadísticas sobre el mazo creado.

## 2. Arquitectura Técnica (¿Cómo está construida?)

La aplicación sigue una arquitectura clásica cliente-servidor, separada en dos partes principales: el **Frontend** (lo que ve el usuario) y el **Backend** (la lógica detrás de escena), comunicados a través de una API REST.

### 2.1. El Frontend (Carpeta `/frontend`)

El frontend es una Single Page Application (SPA) encargada de la interfaz gráfica y la interacción con el usuario.

*   **Vite:** Es la herramienta de construcción (build tool) y el servidor de desarrollo local. Vite es extremadamente rápido en comparación con herramientas más antiguas (como Webpack o Create React App). Se encarga de compilar el código fuente y recargar la página en milisegundos cuando haces un cambio en el código (gracias al Hot Module Replacement).
*   **React:** Es la librería de JavaScript utilizada para construir la interfaz de usuario. Permite crear componentes reutilizables (como una carta `Card`, el gestor de mazos `DeckManager`, etc.) y gestionar el estado dinámico de la aplicación de manera eficiente.
*   **Tailwind CSS:** Es un framework de CSS basado en clases de utilidad. En lugar de escribir archivos `.css` separados, se añaden clases directamente al código HTML/JSX (ej: `flex`, `bg-dark-900`, `text-white`) para dar estilo. Esto permite un desarrollo visual muy ágil y consistente.
*   **Lucide React:** Una librería de iconos que proporciona toda la iconografía moderna de la interfaz (lupas, filtros, menús, etc.).

### 2.2. El Backend (Carpeta `/backend`)

El backend es el servidor que maneja las peticiones del frontend, procesa la lógica de negocio y se comunica con la base de datos.

*   **Node.js:** Es el entorno de ejecución que permite usar código JavaScript en el servidor.
*   **Express:** Es un framework minimalista para Node.js que facilita la creación de APIs REST. En este proyecto, Express se encarga de recibir las peticiones HTTP del frontend (ej: `GET /api/cards`) y devolver los datos en formato JSON.
*   **pg (node-postgres):** Es la librería oficial que permite a Node.js conectarse y ejecutar consultas SQL en bases de datos PostgreSQL.
*   **Cors:** Un middleware de seguridad necesario para permitir que el frontend (que corre en un puerto distinto al backend durante el desarrollo local) pueda hacer peticiones sin ser bloqueado por las políticas de seguridad de los navegadores (CORS policy).
*   **Dotenv:** Permite cargar variables de entorno desde un archivo `.env`. Así se evita tener credenciales y URLs sensibles escritas directamente en el código fuente.

### 2.3. La Base de Datos (Supabase)

*   **Supabase / PostgreSQL:** Supabase es una plataforma como servicio (BaaS) que proporciona, entre otras cosas, una base de datos PostgreSQL alojada en la nube. 
*   En este proyecto se utiliza para almacenar permanentemente la información de todas las cartas del juego, los datos de la colección del usuario y los mazos guardados. El backend se conecta a ella mediante una "Connection String" (URL) que está en el archivo secreto `.env`.

### 2.4. Ejecución (Scripts .bat)

Para facilitar el levantamiento del entorno de desarrollo local en Windows:
*   **`start_app.bat`**: Lanza de forma simultánea tanto el servidor Backend (`npm start`) como el servidor de desarrollo Frontend (`npm run dev`) abriendo terminales independientes.
*   **`stop_app.bat`**: Detiene los procesos de Node.js forzosamente en caso de que los puertos se queden bloqueados.

# Riftbound Collection Tracker

Riftbound Collection Tracker es una aplicación web full-stack para gestionar colecciones de cartas, buscar cartas a través de un catálogo completo y crear mazos para el juego de cartas Riftbound.

## Características

*   **Catálogo Completo:** Visualiza y filtra cartas por rareza, coste, tipo y dominio.
*   **Gestión de Colección:** Lleva el control de las cartas normales y foil que posees.
*   **Importación CSV:** Importa rápidamente tu colección masiva usando un archivo `.csv`.
*   **Deck Builder:** Crea, edita y valida mazos, visualizando la curva de coste de energía y distribución de tipos.
*   **Estadísticas:** Observa tu progreso y porcentaje de completitud de la colección.

## Requisitos Previos

Para ejecutar este proyecto en tu máquina local necesitarás:
*   [Node.js](https://nodejs.org/) (Versión 18 o superior recomendada).
*   Una base de datos PostgreSQL alojada (en este caso, configurada en [Supabase](https://supabase.com/)).

## Instalación y Configuración

Sigue estos pasos para configurar el proyecto en tu entorno local:

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/riftbound.git
    cd riftbound
    ```

2.  **Instalar dependencias del Frontend:**
    ```bash
    cd frontend
    npm install
    cd ..
    ```

3.  **Instalar dependencias del Backend:**
    ```bash
    cd backend
    npm install
    cd ..
    ```

4.  **Configurar Variables de Entorno (IMPORTANTE):**
    En la carpeta `/backend`, debes crear un archivo llamado `.env` (o comprobar si ya existe). Este archivo **no se sube a GitHub** por motivos de seguridad. Debe contener la conexión a la base de datos y el puerto:
    ```env
    DATABASE_URL="postgresql://usuario:password@host:puerto/nombre_db"
    PORT=3001
    ```

## Ejecución del Proyecto (Windows)

En la raíz del proyecto encontrarás dos scripts `.bat` que automatizan el levantamiento de la aplicación:

*   **`start_app.bat`**: Haz doble clic sobre él. Se abrirán dos ventanas de consola: una iniciando el servidor backend en el puerto 3001 y otra iniciando el servidor frontend con Vite (generalmente en el puerto 5173). La aplicación web se abrirá sola en tu navegador predeterminado.
*   **`stop_app.bat`**: Si por algún motivo los procesos se quedan bloqueados en segundo plano, este script cerrará todos los procesos de Node.js de forma forzosa.

## Arquitectura Principal

*   **Frontend:** React, Vite, Tailwind CSS, Lucide React.
*   **Backend:** Node.js, Express, pg (node-postgres), CORS.
*   **Base de Datos:** PostgreSQL (Supabase).

Para información técnica más profunda y detallada sobre la función de cada una de estas piezas, consulta el archivo [DOCUMENTACION.md](./DOCUMENTACION.md).

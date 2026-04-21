# DailyGames

DailyGames es una app web de retos diarios de logica y memoria.
Cada dia se generan partidas nuevas, iguales para todas las personas, y cada usuario puede:

- jugar 5 minijuegos
- guardar su resultado
- mantener racha diaria
- comparar su puesto en el ranking
- compartir su resultado

El proyecto tiene landing publica en /, login en /login, y hub privado en /hub.

## Stack

- Frontend: Vue 3 + Vite + Pinia + Vue Router
- Backend: Appwrite Cloud (Auth, Database, Functions)
- Despliegue frontend: Vercel o Netlify (sitio estatico)

## Juegos incluidos

| Ruta | Juego | Mecanica |
|---|---|---|
| /game | ChromaSequence | Memoriza y reproduce una secuencia de colores |
| /numflow | NumFlow | Ordena numeros como un 15-puzzle |
| /pathfinder | PathFinder | Encuentra una ruta valida en un grid |
| /buscaminas | Buscaminas | Descubre casillas sin pisar minas |
| /sunmoon | Soles y Lunas | Equilibra soles y lunas por fila y columna |

## Como funciona el proyecto

1. El usuario inicia sesion (email/password).
2. El frontend pide el reto diario a Appwrite.
3. Al terminar una partida, se guarda el resultado en la coleccion de resultados.
4. El ranking usa esos resultados para ordenar jugadores por juego.
5. Una Function puede generar automaticamente los retos de cada dia.

## Requisitos para configurarlo en otro equipo

- Node.js 20 o superior
- npm 10 o superior
- Cuenta en Appwrite Cloud
- API key de Appwrite con permisos de Database y Functions

Puedes comprobar versiones con:

```bash
node -v
npm -v
```

## Instalacion local paso a paso

1. Clonar el repositorio.
2. Instalar dependencias.
3. Configurar Appwrite.
4. Generar retos del dia.
5. Levantar el frontend.

Comandos:

```bash
npm install
npm run setup
npm run seed
npm run dev
```

El proyecto arrancara en http://localhost:5173.

## Configuracion de Appwrite

La forma mas rapida es usar el script:

```bash
npm run setup
```

Este asistente crea o configura:

- base de datos
- colecciones
- atributos
- indices
- variables necesarias para el entorno

Si prefieres configurarlo a mano, revisa APPWRITE_SETUP.md.

## Scripts disponibles

| Comando | Que hace |
|---|---|
| npm run setup | Configura Appwrite desde terminal |
| npm run seed | Genera retos para hoy |
| npm run seed:date 2026-04-21 | Genera retos para una fecha concreta |
| npm run seed:force | Regenera retos aunque ya existan |
| npm run deploy:function | Despliega la function generateDaily |
| npm run deploy:replay:function | Despliega la function de limpieza de replay |
| npm run dev | Inicia entorno de desarrollo |
| npm run build | Genera build de produccion |

## Build y despliegue

Para compilar en local:

```bash
npm run build
```

La carpeta de salida es dist/.

Para produccion, puedes desplegar dist/ en Vercel o Netlify.

## Estructura principal

```text
src/
    views/            # landing, login, hub, resultado, ranking
    games/            # vistas y logica de cada juego
    stores/           # auth, base game, stores de estado
    components/       # UI reutilizable (GameShell, botones, barras, etc.)
appwrite-functions/
    generateDaily/    # generacion diaria de retos
    replayCleanup/    # borrado de resultado para replay
scripts/            # setup y despliegue de infraestructura
```
## Pruebalo y comparte ideas

Si te gusta DailyGames, pruebalo en tu equipo y compartelo con otras personas para comparar resultados diarios.

Tambien nos encantaria recibir propuestas de nuevos minijuegos, mecanicas o mejoras de dificultad.
Si pruebas una idea y funciona bien, abre una sugerencia o issue con:

- nombre del juego
- reglas en 3-5 lineas
- ejemplo rapido de como se gana o se pierde
- por que encaja con retos diarios

## Licencia

MIT

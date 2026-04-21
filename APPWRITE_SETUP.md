# DailyGames — Configuración Appwrite

## Opción A: setup automático desde terminal (recomendado)

```bash
npm install
npm run setup
```

El script interactivo te pedirá el **Project ID** y una **API Key**, y se encargará de:
- Crear la base de datos `chromasequence`
- Crear las 3 colecciones con todos sus atributos, tipos, permisos e índices
- Registrar las plataformas web (`localhost` y tu dominio de producción)
- Escribir el fichero `.env` con todas las variables
- Actualizar `src/appwrite.js` para leer del `.env`

Después, genera los retos del día y arranca:

```bash
npm run seed    # genera los 6 retos de hoy
npm run dev     # http://localhost:5173
```

---

## Opción B: setup manual (referencia)

Si prefieres configurar a mano en el dashboard de Appwrite Cloud:

### Prerequisitos

1. Crea un proyecto en [cloud.appwrite.io](https://cloud.appwrite.io)
2. Crea una **API Key** en Settings → API Keys con scope `databases.*`
3. En **Platforms**, añade una plataforma Web con hostname `localhost`

---

### Base de datos

ID: `chromasequence`

#### Colección: `daily_challenges`

| Atributo   | Tipo     | Req | Notas |
|------------|----------|-----|-------|
| date       | string   | ✅  | `YYYY-MM-DD` |
| gameType   | string   | ✅  | `chromasequence` / `numflow` / `pathfinder` / `buscaminas` / `sunmoon` / `memorygrid` |
| difficulty | string   | ✅  | `easy` / `medium` / `hard` |
| sequence   | string[] | ❌  | Solo ChromaSequence |
| payload    | string   | ❌  | JSON stringificado para los demás juegos (máx. 8192 chars) |

Permisos: `role:all` → read  
Índice unique: `date` + `gameType`

#### Colección: `game_results`

| Atributo    | Tipo    | Req |
|-------------|---------|-----|
| userId      | string  | ✅  |
| userName    | string  | ✅  |
| date        | string  | ✅  |
| gameType    | string  | ✅  |
| won         | boolean | ✅  |
| attempts    | integer | ✅  |
| timeMs      | integer | ✅  |
| challengeId | string  | ✅  |
| moves       | integer | ❌  |
| score       | integer | ❌  |

Permisos: `role:users` → create; `role:all` → read  
Índices: `userId+date+gameType` (key), `date+gameType+won+timeMs` (key)

#### Colección: `user_stats`

| Atributo       | Tipo    | Req |
|----------------|---------|-----|
| userId         | string  | ✅  |
| gameType       | string  | ✅  |
| totalGames     | integer | ✅  |
| totalWins      | integer | ✅  |
| streak         | integer | ✅  |
| bestStreak     | integer | ✅  |
| bestTimeMs     | integer | ✅  |
| bestMoves      | integer | ❌  |
| lastPlayedDate | string  | ✅  |

Permisos: `role:users` → create, read, update  
Índice unique: `userId` + `gameType`

---

### Autenticación

En **Auth → Settings**:
- Activa **Email/Password**

---

### Function: generateDailyChallenge

```bash
# Desplegar desde terminal
npm run deploy:function

# O generar los retos directamente (sin Appwrite Function)
npm run seed
npm run seed:date 2025-12-25   # fecha concreta
npm run seed:force              # forzar regeneración
```

Trigger CRON para la función: `0 0 * * *`

### Function extra: replayCleanup

Esta función borra el resultado actual de un juego y recalcula `user_stats` al pulsar "Volver a jugar".

```bash
npm run deploy:replay:function
```


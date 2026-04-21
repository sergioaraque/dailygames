#!/usr/bin/env node
// scripts/setup-appwrite.mjs
// Configura todo Appwrite para DailyGames desde la terminal.
// Uso: node scripts/setup-appwrite.mjs

import { createInterface } from 'readline'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { Client, Databases, Teams, Permission, Role, IndexType } from 'node-appwrite'
import { fileURLToPath } from 'url'

// ── Colores ANSI ─────────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
  gray:   '\x1b[90m',
}

const ok    = (msg) => console.log(`  ${c.green}✓${c.reset} ${msg}`)
const fail  = (msg) => console.log(`  ${c.red}✗${c.reset} ${msg}`)
const info  = (msg) => console.log(`  ${c.cyan}·${c.reset} ${msg}`)
const warn  = (msg) => console.log(`  ${c.yellow}!${c.reset} ${msg}`)
const title = (msg) => console.log(`\n${c.bold}${c.white}${msg}${c.reset}`)
const sep   = ()    => console.log(`  ${c.gray}${'─'.repeat(50)}${c.reset}`)

// ── Readline helper ───────────────────────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout })
const ask = (question, def = '') => new Promise(resolve => {
  const hint = def ? ` ${c.gray}(${def})${c.reset}` : ''
  rl.question(`  ${c.cyan}?${c.reset} ${question}${hint}: `, ans => {
    resolve(ans.trim() || def)
  })
})
const confirm = (question) => new Promise(resolve => {
  rl.question(`  ${c.yellow}?${c.reset} ${question} ${c.gray}(s/N)${c.reset}: `, ans => {
    resolve(ans.trim().toLowerCase() === 's')
  })
})

// ── Retry helper ──────────────────────────────────────────────────────────────
async function tryCreate(label, fn) {
  try {
    const result = await fn()
    ok(label)
    return result
  } catch (e) {
    if (e.code === 409) {
      warn(`${label} ${c.gray}(ya existía, omitido)${c.reset}`)
      return null
    }
    fail(`${label}: ${e.message}`)
    return null
  }
}

// ── Schema definition ─────────────────────────────────────────────────────────
const DB_ID = 'chromasequence'

const COLLECTIONS = [
  {
    id: 'daily_challenges',
    name: 'daily_challenges',
    permissions: [Permission.read(Role.any())],
    attributes: [
      { type: 'string',  key: 'date',       size: 10,   required: true  },
      { type: 'string',  key: 'gameType',   size: 32,   required: true  },
      { type: 'string',  key: 'difficulty', size: 16,   required: true  },
      { type: 'string',  key: 'payload',    size: 8192, required: false },
      { type: 'string[]',key: 'sequence',   size: 32,   required: false, array: true },
    ],
    indexes: [
      { key: 'date_gameType', type: 'unique', attributes: ['date', 'gameType'], orders: ['ASC', 'ASC'] },
    ]
  },
  {
    id: 'game_results',
    name: 'game_results',
    permissions: [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
    ],
    attributes: [
      { type: 'string',  key: 'userId',      size: 64,  required: true  },
      { type: 'string',  key: 'userName',    size: 128, required: true  },
      { type: 'string',  key: 'date',        size: 10,  required: true  },
      { type: 'string',  key: 'gameType',    size: 32,  required: true  },
      { type: 'boolean', key: 'won',                    required: true  },
      { type: 'integer', key: 'attempts',               required: true  },
      { type: 'integer', key: 'timeMs',                 required: true  },
      { type: 'string',  key: 'challengeId', size: 64,  required: true  },
      { type: 'integer', key: 'moves',                  required: false },
      { type: 'integer', key: 'score',                  required: false },
    ],
    indexes: [
      { key: 'user_date_game', type: 'key',    attributes: ['userId', 'date', 'gameType'], orders: ['ASC','ASC','ASC'] },
      { key: 'leaderboard',    type: 'key',    attributes: ['date', 'gameType', 'won', 'timeMs'], orders: ['ASC','ASC','ASC','ASC'] },
    ]
  },
  {
    id: 'user_stats',
    name: 'user_stats',
    permissions: [
      Permission.read(Role.users()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
    ],
    attributes: [
      { type: 'string',  key: 'userId',         size: 64, required: true  },
      { type: 'string',  key: 'gameType',        size: 32, required: true  },
      { type: 'integer', key: 'totalGames',                required: true  },
      { type: 'integer', key: 'totalWins',                 required: true  },
      { type: 'integer', key: 'streak',                    required: true  },
      { type: 'integer', key: 'bestStreak',                required: true  },
      { type: 'integer', key: 'bestTimeMs',                required: true  },
      { type: 'integer', key: 'bestMoves',                 required: false },
      { type: 'string',  key: 'lastPlayedDate',  size: 10, required: true  },
    ],
    indexes: [
      { key: 'user_game', type: 'unique', attributes: ['userId', 'gameType'], orders: ['ASC','ASC'] },
    ]
  }
]

// ── Crear atributo según tipo ─────────────────────────────────────────────────
async function createAttribute(db, collectionId, attr) {
  const label = `  attr: ${attr.key}`
  try {
    if (attr.array) {
      await db.createStringAttribute(DB_ID, collectionId, attr.key, attr.size, attr.required ?? false, undefined, true)
    } else if (attr.type === 'string') {
      await db.createStringAttribute(DB_ID, collectionId, attr.key, attr.size, attr.required ?? false)
    } else if (attr.type === 'integer') {
      await db.createIntegerAttribute(DB_ID, collectionId, attr.key, attr.required ?? false)
    } else if (attr.type === 'boolean') {
      await db.createBooleanAttribute(DB_ID, collectionId, attr.key, attr.required ?? false)
    } else if (attr.type === 'float') {
      await db.createFloatAttribute(DB_ID, collectionId, attr.key, attr.required ?? false)
    }
    ok(label)
  } catch (e) {
    if (e.code === 409) warn(`${label} ${c.gray}(ya existía)${c.reset}`)
    else fail(`${label}: ${e.message}`)
  }
}

// ── Esperar a que los atributos estén disponibles ─────────────────────────────
async function waitForAttributes(db, collectionId, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const col = await db.getCollection(DB_ID, collectionId)
    const allReady = col.attributes.every(a => a.status === 'available')
    if (allReady && col.attributes.length > 0) return true
    await new Promise(r => setTimeout(r, 2000))
    process.stdout.write('.')
  }
  return false
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.clear()
  console.log(`\n${c.bold}${c.cyan}  DailyGames — Setup Appwrite${c.reset}`)
  console.log(`  ${c.gray}Configura toda la infraestructura en un paso${c.reset}\n`)
  sep()

  // 1. Credenciales
  title('1. Credenciales')
  info('Necesitas un proyecto en cloud.appwrite.io y una API Key con scope databases.*')
  info('Docs: https://appwrite.io/docs/advanced/platform/api-keys\n')

  let endpoint    = 'https://cloud.appwrite.io/v1'
  let projectId   = ''
  let apiKey      = ''
  let localDomain = 'localhost'
  let prodDomain  = ''

  // Intentar leer .env si existe
  const envPath = fileURLToPath(new URL('../.env', import.meta.url))
  if (existsSync(envPath)) {
    const env = readFileSync(envPath, 'utf8')
    const get = (key) => env.match(new RegExp(`${key}=(.+)`))?.[1]?.trim() ?? ''
    endpoint  = get('VITE_APPWRITE_ENDPOINT') || endpoint
    projectId = get('VITE_APPWRITE_PROJECT')  || ''
    info(`Encontrado .env — leyendo valores existentes`)
  }

  endpoint  = await ask('Endpoint Appwrite', endpoint)
  projectId = await ask('Project ID')
  apiKey    = await ask('API Key (databases.* scope)')

  if (!projectId || !apiKey) {
    fail('Project ID y API Key son obligatorios. Saliendo.')
    rl.close(); process.exit(1)
  }

  // 2. Plataformas web
  title('2. Dominios web')
  localDomain = await ask('Dominio local', 'localhost')
  prodDomain  = await ask('Dominio producción (dejar vacío para omitir)', '')

  // 3. Inicializar cliente
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey)

  const db = new Databases(client)

  // 4. Crear base de datos
  title('3. Base de datos')
  await tryCreate(`Base de datos: ${DB_ID}`, () =>
    db.create(DB_ID, 'DailyGames')
  )

  // 5. Crear colecciones, atributos e índices
  title('4. Colecciones')

  for (const col of COLLECTIONS) {
    sep()
    info(`Creando colección: ${c.bold}${col.id}${c.reset}`)

    await tryCreate(`Colección ${col.id}`, () =>
      db.createCollection(DB_ID, col.id, col.name, col.permissions)
    )

    // Atributos
    for (const attr of col.attributes) {
      await createAttribute(db, col.id, attr)
      // Pequeña pausa para no saturar la API
      await new Promise(r => setTimeout(r, 300))
    }

    // Esperar a que los atributos estén listos antes de crear índices
    if (col.indexes.length > 0) {
      process.stdout.write(`  ${c.gray}Esperando que los atributos estén listos`)
      const ready = await waitForAttributes(db, col.id)
      console.log(ready ? ` ${c.green}listo${c.reset}` : ` ${c.yellow}timeout${c.reset}`)

      for (const idx of col.indexes) {
        await tryCreate(`  índice: ${idx.key}`, () =>
          db.createIndex(DB_ID, col.id, idx.key, idx.type, idx.attributes, idx.orders)
        )
        await new Promise(r => setTimeout(r, 300))
      }
    }
  }

  // 6. Registrar plataformas web via REST (node-appwrite no expone Projects API en client SDK)
  title('5. Plataformas web')
  info(`Para registrar plataformas necesitas hacer esto manualmente en el dashboard`)
  info(`o usar la Management API con tu API Key de servidor.\n`)

  const platformsToAdd = [localDomain, prodDomain].filter(Boolean)
  for (const domain of platformsToAdd) {
    try {
      const res = await fetch(`${endpoint}/projects/${projectId}/platforms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Key': apiKey,
          'X-Appwrite-Project': projectId,
        },
        body: JSON.stringify({ type: 'web', name: domain, hostname: domain })
      })
      if (res.ok) ok(`Plataforma registrada: ${domain}`)
      else {
        const body = await res.json()
        if (body.code === 409) warn(`Plataforma ${domain} ya existía`)
        else warn(`Plataforma ${domain}: ${body.message}`)
      }
    } catch (e) {
      warn(`Plataforma ${domain}: ${e.message}`)
    }
  }

  // 7. Escribir .env
  title('6. Fichero .env')
  const shouldWriteEnv = await confirm('¿Escribir / actualizar .env con las credenciales?')
  if (shouldWriteEnv) {
    const envContent = `# DailyGames — generado por setup-appwrite.mjs
VITE_APPWRITE_ENDPOINT=${endpoint}
VITE_APPWRITE_PROJECT=${projectId}
VITE_DATABASE_ID=${DB_ID}
VITE_COLLECTION_DAILY=daily_challenges
VITE_COLLECTION_RESULTS=game_results
VITE_COLLECTION_STATS=user_stats

# Solo para la Appwrite Function (NO expongas esto en el frontend)
APPWRITE_API_KEY=${apiKey}
`
    writeFileSync(envPath, envContent)
    ok(`.env escrito en ${envPath}`)

    // También actualizar src/appwrite.js para leer del .env
    const appwriteJsPath = fileURLToPath(new URL('../src/appwrite.js', import.meta.url))
    const appwriteJs = `// src/appwrite.js — actualizado por setup-appwrite.mjs
export const APPWRITE_ENDPOINT  = import.meta.env.VITE_APPWRITE_ENDPOINT  || '${endpoint}'
export const APPWRITE_PROJECT   = import.meta.env.VITE_APPWRITE_PROJECT   || '${projectId}'
export const DATABASE_ID        = import.meta.env.VITE_DATABASE_ID        || '${DB_ID}'
export const COLLECTION_DAILY   = import.meta.env.VITE_COLLECTION_DAILY   || 'daily_challenges'
export const COLLECTION_RESULTS = import.meta.env.VITE_COLLECTION_RESULTS || 'game_results'
export const COLLECTION_STATS   = import.meta.env.VITE_COLLECTION_STATS   || 'user_stats'

import { Client, Account, Databases, Functions } from 'appwrite'

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT)

export const account   = new Account(client)
export const databases = new Databases(client)
export const functions = new Functions(client)
export default client
`
    writeFileSync(appwriteJsPath, appwriteJs)
    ok('src/appwrite.js actualizado para leer del .env')
  }

  // 8. Instrucciones finales
  title('7. Pasos finales')
  sep()
  info(`${c.bold}Autenticación${c.reset} — activa en el dashboard de Appwrite:`)
  console.log(`     · Email/Password`)
  console.log(`     · Google OAuth (necesitas credenciales de Google Cloud Console)`)
  console.log(`       Redirect URI: ${endpoint}/account/sessions/oauth2/callback/google/${projectId}\n`)
  info(`${c.bold}Function generateDailyChallenge${c.reset}:`)
  console.log(`     node scripts/deploy-function.mjs   (o sube manualmente a Appwrite)`)
  console.log(`     Cron: 0 0 * * *\n`)
  info(`${c.bold}Generar retos de hoy${c.reset}:`)
  console.log(`     node scripts/seed-today.mjs\n`)
  sep()
  ok(`${c.bold}${c.green}Setup completado.${c.reset} Ahora puedes ejecutar ${c.cyan}npm run dev${c.reset}`)
  console.log()

  rl.close()
}

main().catch(e => {
  fail(`Error inesperado: ${e.message}`)
  rl.close()
  process.exit(1)
})

#!/usr/bin/env node
// scripts/seed-today.mjs
// Genera los 5 retos del día actual (o de la fecha indicada) directamente desde terminal.
// Uso:
//   node scripts/seed-today.mjs
//   node scripts/seed-today.mjs --date 2025-12-25
//   node scripts/seed-today.mjs --force   (elimina y recrea si ya existen)

import { Client, Databases, ID, Query } from 'node-appwrite'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'

// ── Colores ───────────────────────────────────────────────────────────────────
const c = { reset:'\x1b[0m', bold:'\x1b[1m', green:'\x1b[32m', yellow:'\x1b[33m', red:'\x1b[31m', cyan:'\x1b[36m', gray:'\x1b[90m' }
const ok   = (msg) => console.log(`  ${c.green}✓${c.reset} ${msg}`)
const fail = (msg) => console.log(`  ${c.red}✗${c.reset} ${msg}`)
const info = (msg) => console.log(`  ${c.cyan}·${c.reset} ${msg}`)
const warn = (msg) => console.log(`  ${c.yellow}!${c.reset} ${msg}`)

// ── Args ──────────────────────────────────────────────────────────────────────
const args  = process.argv.slice(2)
const force = args.includes('--force')
const dateArg = args.find(a => a.startsWith('--date'))
const targetDate = dateArg ? dateArg.split('=')[1] || args[args.indexOf('--date') + 1] : new Date().toISOString().slice(0, 10)

// ── Leer config desde .env ────────────────────────────────────────────────────
function loadEnv() {
  const envPath = fileURLToPath(new URL('../.env', import.meta.url))
  if (!existsSync(envPath)) {
    fail('.env no encontrado. Ejecuta primero: node scripts/setup-appwrite.mjs')
    process.exit(1)
  }
  const env = readFileSync(envPath, 'utf8')
  const get = (key) => env.match(new RegExp(`^${key}=(.+)`, 'm'))?.[1]?.trim() ?? ''
  return {
    endpoint:  get('VITE_APPWRITE_ENDPOINT') || 'https://cloud.appwrite.io/v1',
    projectId: get('VITE_APPWRITE_PROJECT'),
    apiKey:    get('APPWRITE_API_KEY'),
    dbId:      get('VITE_DATABASE_ID') || 'chromasequence',
    colDaily:  get('VITE_COLLECTION_DAILY') || 'daily_challenges',
  }
}

// ── Generadores (misma lógica que la Appwrite Function) ───────────────────────
function seededRand(seed) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}
function shuffleWithSeed(arr, rand) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function genChromaSequence(date, difficulty) {
  const COLORS = ['red', 'blue', 'green', 'amber', 'purple', 'teal']
  const len = { easy: 4, medium: 5, hard: 6 }[difficulty]
  const rand = seededRand(parseInt(date.replace(/-/g, '')) + 1)
  return { sequence: Array.from({ length: len }, () => COLORS[Math.floor(rand() * COLORS.length)]), difficulty }
}

function genNumFlow(date) {
  const SIZE = 3, N = SIZE * SIZE
  const rand = seededRand(parseInt(date.replace(/-/g, '')) + 2)
  let board = Array.from({ length: N }, (_, i) => (i + 1) % N)
  let blank = N - 1
  const nbrs = (i) => {
    const r = Math.floor(i/SIZE), c = i%SIZE, n = []
    if (r>0) n.push(i-SIZE); if (r<SIZE-1) n.push(i+SIZE)
    if (c>0) n.push(i-1);   if (c<SIZE-1) n.push(i+1)
    return n
  }
  let last = -1
  for (let m = 0; m < 20; m++) {
    const pick = nbrs(blank).filter(n => n !== last)
    const chosen = pick[Math.floor(rand() * pick.length)]
    board[blank] = board[chosen]; board[chosen] = 0
    last = blank; blank = chosen
  }
  return { payload: JSON.stringify(board) }
}

function genPathFinder(date) {
  const SIZE = 4
  const rand = seededRand(parseInt(date.replace(/-/g, '')) + 4)
  const grid = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => (rand() > 0.7 ? 'blue' : 'white'))
  )
  grid[0][0] = 'white'; grid[SIZE-1][SIZE-1] = 'green'
  return { payload: JSON.stringify({ grid, start: [0,0], end: [SIZE-1, SIZE-1] }) }
}

function genBuscaminas(date) {
  const SIZE = 6
  const MINE_COUNT = 6
  const rand = seededRand(parseInt(date.replace(/-/g, '')) + 6)

  const mineSet = new Set()
  while (mineSet.size < MINE_COUNT) {
    mineSet.add(Math.floor(rand() * (SIZE * SIZE)))
  }

  return {
    payload: JSON.stringify({
      size: SIZE,
      mineCount: MINE_COUNT,
      mines: [...mineSet]
    })
  }
}

function genSunMoon(date) {
  const SIZE = 4
  const rand = seededRand(parseInt(date.replace(/-/g, '')) + 7)

  const base = Array.from({ length: SIZE }, (_, r) =>
    Array.from({ length: SIZE }, (_, c) => ((r + c) % 2 === 0 ? 'sun' : 'moon'))
  )

  const swapSymbols = rand() > 0.5
  const solution = base.map(row => row.map(v => {
    if (!swapSymbols) return v
    return v === 'sun' ? 'moon' : 'sun'
  }))

  const puzzle = solution.map(row => row.map(() => null))
  const revealCount = 8
  const picks = new Set()
  while (picks.size < revealCount) picks.add(Math.floor(rand() * (SIZE * SIZE)))
  for (const p of picks) {
    const r = Math.floor(p / SIZE)
    const c = p % SIZE
    puzzle[r][c] = solution[r][c]
  }

  return {
    payload: JSON.stringify({
      size: SIZE,
      puzzle,
      solution
    })
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${c.bold}${c.cyan}  DailyGames — Seed retos${c.reset}`)
  console.log(`  ${c.gray}Fecha: ${targetDate}${force ? '  (--force: eliminará existentes)' : ''}${c.reset}\n`)

  const { endpoint, projectId, apiKey, dbId, colDaily } = loadEnv()

  if (!projectId || !apiKey) {
    fail('Faltan VITE_APPWRITE_PROJECT o APPWRITE_API_KEY en .env')
    process.exit(1)
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
  const db = new Databases(client)

  const dow  = new Date(targetDate + 'T12:00:00Z').getDay()
  const diff = dow <= 2 ? 'easy' : dow <= 4 ? 'medium' : 'hard'
  info(`Dificultad para ${targetDate}: ${c.bold}${diff}${c.reset} (día ${dow})\n`)

  const generators = [
    { gameType: 'chromasequence', data: genChromaSequence(targetDate, diff) },
    { gameType: 'numflow',        data: genNumFlow(targetDate) },
    { gameType: 'pathfinder',     data: genPathFinder(targetDate) },
    { gameType: 'buscaminas',     data: genBuscaminas(targetDate) },
    { gameType: 'sunmoon',        data: genSunMoon(targetDate) },
  ]

  for (const { gameType, data } of generators) {
    try {
      // Comprobar si ya existe
      const existing = await db.listDocuments(dbId, colDaily, [
        Query.equal('date', targetDate),
        Query.equal('gameType', gameType),
        Query.limit(1)
      ])

      if (existing.documents.length > 0) {
        if (force) {
          await db.deleteDocument(dbId, colDaily, existing.documents[0].$id)
          warn(`${gameType}: reto anterior eliminado`)
        } else {
          warn(`${gameType}: ya existe (usa --force para reemplazar)`)
          continue
        }
      }

      await db.createDocument(dbId, colDaily, ID.unique(), {
        date: targetDate,
        gameType,
        difficulty: diff,
        ...data
      })
      ok(`${gameType} ${c.gray}→ ${targetDate}${c.reset}`)
    } catch (e) {
      fail(`${gameType}: ${e.message}`)
    }
  }

  console.log(`\n  ${c.green}${c.bold}Listo.${c.reset} Los retos de ${targetDate} están disponibles.\n`)
}

main().catch(e => {
  fail(`Error: ${e.message}`)
  process.exit(1)
})

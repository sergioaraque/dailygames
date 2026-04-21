// appwrite-functions/generateDaily/index.js
// Cron: "0 0 * * *"  →  genera 5 retos (uno por juego) cada medianoche.
// Variables: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, DATABASE_ID, COLLECTION_DAILY

import { Client, Databases, ID } from 'node-appwrite'

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY)

const db  = new Databases(client)
const DB  = process.env.DATABASE_ID
const COL = process.env.COLLECTION_DAILY

function today() { return new Date().toISOString().slice(0, 10) }

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

export default async ({ log, error }) => {
  const date = today()
  const dow  = new Date().getDay()
  const diff = dow <= 2 ? 'easy' : dow <= 4 ? 'medium' : 'hard'

  const generators = [
    { gameType: 'chromasequence', data: genChromaSequence(date, diff) },
    { gameType: 'numflow',        data: genNumFlow(date) },
    { gameType: 'pathfinder',     data: genPathFinder(date) },
    { gameType: 'buscaminas',     data: genBuscaminas(date) },
    { gameType: 'sunmoon',        data: genSunMoon(date) }
  ]

  for (const { gameType, data } of generators) {
    try {
      await db.createDocument(DB, COL, ID.unique(), { date, gameType, difficulty: diff, ...data })
      log(`✓ ${gameType} → ${date}`)
    } catch (e) {
      error(`✗ ${gameType}: ${e.message}`)
    }
  }
}

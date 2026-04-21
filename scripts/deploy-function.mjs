#!/usr/bin/env node
// scripts/deploy-function.mjs
// Despliega la Appwrite Function generateDailyChallenge desde la terminal.
// Crea la función, sube el código y configura el trigger CRON.
// Uso: node scripts/deploy-function.mjs

import { Client, Functions, InputFile } from 'node-appwrite'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

const __dir = fileURLToPath(new URL('..', import.meta.url))

const c = { reset:'\x1b[0m', bold:'\x1b[1m', green:'\x1b[32m', yellow:'\x1b[33m', red:'\x1b[31m', cyan:'\x1b[36m', gray:'\x1b[90m' }
const ok   = (msg) => console.log(`  ${c.green}✓${c.reset} ${msg}`)
const fail = (msg) => console.log(`  ${c.red}✗${c.reset} ${msg}`)
const info = (msg) => console.log(`  ${c.cyan}·${c.reset} ${msg}`)
const warn = (msg) => console.log(`  ${c.yellow}!${c.reset} ${msg}`)

const rl  = createInterface({ input: process.stdin, output: process.stdout })
const ask = (q, def = '') => new Promise(r => rl.question(`  ${c.cyan}?${c.reset} ${q}${def ? ` ${c.gray}(${def})${c.reset}` : ''}: `, a => r(a.trim() || def)))

async function syncVariables(fns, functionId, variables) {
  const current = await fns.listVariables(functionId)
  const byKey = new Map(current.variables.map(v => [v.key, v]))

  for (const variable of variables) {
    const existing = byKey.get(variable.key)
    if (existing) {
      await fns.updateVariable(functionId, existing.$id, variable.key, variable.value, variable.secret ?? false)
      ok(`Variable actualizada: ${variable.key}`)
    } else {
      await fns.createVariable(functionId, variable.key, variable.value, variable.secret ?? false)
      ok(`Variable creada: ${variable.key}`)
    }
  }
}

function loadEnv() {
  const envPath = join(__dir, '.env')
  if (!existsSync(envPath)) { fail('.env no encontrado. Ejecuta setup-appwrite.mjs primero.'); process.exit(1) }
  const env = readFileSync(envPath, 'utf8')
  const get = (key) => env.match(new RegExp(`^${key}=(.+)`, 'm'))?.[1]?.trim() ?? ''
  return {
    endpoint:  get('VITE_APPWRITE_ENDPOINT') || 'https://cloud.appwrite.io/v1',
    projectId: get('VITE_APPWRITE_PROJECT'),
    apiKey:    get('APPWRITE_API_KEY'),
    dbId:      get('VITE_DATABASE_ID')       || 'chromasequence',
    colDaily:  get('VITE_COLLECTION_DAILY')  || 'daily_challenges',
    runtime:   get('APPWRITE_FUNCTION_RUNTIME') || 'node-20.0',
  }
}

async function main() {
  console.log(`\n${c.bold}${c.cyan}  DailyGames — Deploy Function${c.reset}\n`)

  const env = loadEnv()
  if (!env.projectId || !env.apiKey) {
    fail('Faltan credenciales en .env')
    rl.close(); process.exit(1)
  }

  const client = new Client().setEndpoint(env.endpoint).setProject(env.projectId).setKey(env.apiKey)
  const fns    = new Functions(client)

  const FN_ID   = 'generate-daily-challenge'
  const FN_NAME = 'generateDailyChallenge'
  const runtimeCandidates = [env.runtime, 'node-20.0', 'node-18.0', 'node-16.0'].filter((v, i, a) => v && a.indexOf(v) === i)
  const functionVariables = [
    { key: 'APPWRITE_ENDPOINT', value: env.endpoint },
    { key: 'APPWRITE_PROJECT_ID', value: env.projectId },
    { key: 'APPWRITE_API_KEY', value: env.apiKey, secret: true },
    { key: 'DATABASE_ID', value: env.dbId },
    { key: 'COLLECTION_DAILY', value: env.colDaily },
  ]

  // 1. Crear o reusar función
  let fnDoc = null
  try {
    fnDoc = await fns.get(FN_ID)
    warn(`Función ${FN_ID} ya existe — se actualizará el código`)
  } catch {
    info('Creando función...')
    let created = false
    let lastError = null
    for (const runtime of runtimeCandidates) {
      try {
        fnDoc = await fns.create(
          FN_ID,
          FN_NAME,
          runtime,
          undefined,
          undefined,
          '0 0 * * *',
          undefined,
          true,
          true
        )
        ok(`Función creada: ${FN_ID} (${runtime})`)
        created = true
        break
      } catch (e) {
        lastError = e
        if (e.type === 'function_runtime_unsupported') {
          warn(`Runtime no soportado: ${runtime}`)
          continue
        }
        break
      }
    }

    if (!created) {
      fail(`No se pudo crear la función: ${lastError?.message || 'error desconocido'}`)
      rl.close(); process.exit(1)
    }
  }

  info('Sincronizando variables de entorno de la función...')
  try {
    await syncVariables(fns, FN_ID, functionVariables)
  } catch (e) {
    fail(`No se pudieron sincronizar variables: ${e.message}`)
    rl.close(); process.exit(1)
  }

  // 2. Empaquetar el código en un tar.gz
  info('Empaquetando código de la función...')
  const fnSrc  = join(__dir, 'appwrite-functions', 'generateDaily')
  const tarOut = join(__dir, 'appwrite-functions', 'generateDaily.tar.gz')

  // Añadir package.json mínimo si no existe
  const pkgPath = join(fnSrc, 'package.json')
  if (!existsSync(pkgPath)) {
    writeFileSync(pkgPath, JSON.stringify({
      name: 'generate-daily-challenge',
      type: 'module',
      dependencies: { 'node-appwrite': '^12.0.0' }
    }, null, 2))
    ok('package.json creado para la función')
  }

  try {
    execSync(`tar -czf "${tarOut}" -C "${fnSrc}" .`, { stdio: 'pipe' })
    ok('Código empaquetado')
  } catch (e) {
    fail(`Error al empaquetar: ${e.message}`)
    rl.close(); process.exit(1)
  }

  // 3. Subir deployment
  info('Subiendo deployment a Appwrite...')
  try {
    const tarBuffer = readFileSync(tarOut)
    const tarFile = InputFile.fromBuffer(tarBuffer, 'code.tar.gz')

    const deployment = await fns.createDeployment(
      FN_ID,
      tarFile,
      true,              // activate
      'index.js'         // entrypoint
    )
    ok(`Deployment subido: ${deployment.$id}`)
  } catch (e) {
    fail(`Error subiendo deployment: ${e.message}`)
    info('Puedes subir el archivo manualmente desde el dashboard:')
    info(`  ${tarOut}`)
    info(`  Entrypoint: index.js`)
    rl.close(); process.exit(1)
  }

  // 4. Resultado final
  console.log(`\n  ${c.green}${c.bold}Función desplegada.${c.reset}`)
  info(`ID: ${FN_ID}`)
  info(`CRON: 0 0 * * *  (medianoche UTC)`)
  info(`Para ejecutar ahora: node scripts/seed-today.mjs\n`)

  rl.close()
}

main().catch(e => {
  fail(`Error: ${e.message}`)
  rl.close()
  process.exit(1)
})

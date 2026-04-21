#!/usr/bin/env node
// scripts/deploy-replay-cleanup.mjs
// Deploys the function that removes a saved result and rebuilds stats for replay.

import { Client, Functions, InputFile } from 'node-appwrite'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dir = fileURLToPath(new URL('..', import.meta.url))

const c = { reset:'\x1b[0m', bold:'\x1b[1m', green:'\x1b[32m', yellow:'\x1b[33m', red:'\x1b[31m', cyan:'\x1b[36m', gray:'\x1b[90m' }
const ok   = (msg) => console.log(`  ${c.green}+${c.reset} ${msg}`)
const fail = (msg) => console.log(`  ${c.red}x${c.reset} ${msg}`)
const info = (msg) => console.log(`  ${c.cyan}*${c.reset} ${msg}`)
const warn = (msg) => console.log(`  ${c.yellow}!${c.reset} ${msg}`)

function loadEnv() {
  const envPath = join(__dir, '.env')
  if (!existsSync(envPath)) {
    fail('.env not found. Run setup-appwrite.mjs first.')
    process.exit(1)
  }

  const env = readFileSync(envPath, 'utf8')
  const get = (key) => env.match(new RegExp(`^${key}=(.+)`, 'm'))?.[1]?.trim() ?? ''

  return {
    endpoint: get('VITE_APPWRITE_ENDPOINT') || 'https://cloud.appwrite.io/v1',
    projectId: get('VITE_APPWRITE_PROJECT'),
    apiKey: get('APPWRITE_API_KEY'),
    dbId: get('VITE_DATABASE_ID') || 'chromasequence',
    colResults: get('VITE_COLLECTION_RESULTS') || 'game_results',
    colStats: get('VITE_COLLECTION_STATS') || 'user_stats',
    runtime: get('APPWRITE_FUNCTION_RUNTIME') || 'node-20.0',
  }
}

async function syncVariables(fns, functionId, variables) {
  const current = await fns.listVariables(functionId)
  const byKey = new Map(current.variables.map((v) => [v.key, v]))

  for (const variable of variables) {
    const existing = byKey.get(variable.key)
    if (existing) {
      await fns.updateVariable(functionId, existing.$id, variable.key, variable.value, variable.secret ?? false)
      ok(`Variable updated: ${variable.key}`)
    } else {
      await fns.createVariable(functionId, variable.key, variable.value, variable.secret ?? false)
      ok(`Variable created: ${variable.key}`)
    }
  }
}

async function createFunctionWithFallback(fns, functionId, functionName, runtimeCandidates) {
  let lastError = null

  for (const runtime of runtimeCandidates) {
    try {
      const created = await fns.create(
        functionId,
        functionName,
        runtime,
        ['users'],
        undefined,
        undefined,
        undefined,
        true,
        true,
        'index.js',
        'npm install'
      )
      ok(`Function created: ${functionId} (${runtime})`)
      return created
    } catch (e) {
      lastError = e
      if (e.type === 'function_runtime_unsupported') {
        warn(`Unsupported runtime: ${runtime}`)
        continue
      }
      break
    }
  }

  throw lastError || new Error('Could not create function')
}

async function ensureExecutePermissions(fns, fnDoc) {
  const execute = Array.isArray(fnDoc.execute) ? fnDoc.execute : []
  const hasUsersExecute = execute.includes('users')
  const desiredCommands = 'npm install'
  const needsCommandsUpdate = (fnDoc.commands || '').trim() !== desiredCommands

  if (hasUsersExecute && !needsCommandsUpdate) {
    ok('Function permissions and commands are already configured')
    return
  }

  const updatedExecute = hasUsersExecute ? execute : [...new Set([...execute, 'users'])]
  await fns.update(
    fnDoc.$id,
    fnDoc.name,
    fnDoc.runtime,
    updatedExecute,
    fnDoc.events,
    fnDoc.schedule,
    fnDoc.timeout,
    fnDoc.enabled,
    fnDoc.logging,
    fnDoc.entrypoint || 'index.js',
    desiredCommands
  )
  if (!hasUsersExecute) ok('Execute permission updated: users')
  if (needsCommandsUpdate) ok('Function commands updated: npm install')
}

async function main() {
  console.log(`\n${c.bold}${c.cyan}  DailyGames - Deploy Replay Cleanup${c.reset}\n`)

  const env = loadEnv()
  if (!env.projectId || !env.apiKey) {
    fail('Missing VITE_APPWRITE_PROJECT or APPWRITE_API_KEY in .env')
    process.exit(1)
  }

  const client = new Client()
    .setEndpoint(env.endpoint)
    .setProject(env.projectId)
    .setKey(env.apiKey)
  const fns = new Functions(client)

  const FN_ID = 'replay-cleanup'
  const FN_NAME = 'replayCleanup'
  const runtimeCandidates = [env.runtime, 'node-20.0', 'node-18.0', 'node-16.0'].filter((v, i, a) => v && a.indexOf(v) === i)
  const functionVariables = [
    { key: 'APPWRITE_ENDPOINT', value: env.endpoint },
    { key: 'APPWRITE_PROJECT_ID', value: env.projectId },
    { key: 'APPWRITE_API_KEY', value: env.apiKey, secret: true },
    { key: 'DATABASE_ID', value: env.dbId },
    { key: 'COLLECTION_RESULTS', value: env.colResults },
    { key: 'COLLECTION_STATS', value: env.colStats },
  ]

  try {
    const existing = await fns.get(FN_ID)
    await ensureExecutePermissions(fns, existing)
    warn(`Function ${FN_ID} already exists - code will be updated`)
  } catch {
    info('Creating function...')
    try {
      await createFunctionWithFallback(fns, FN_ID, FN_NAME, runtimeCandidates)
    } catch (e) {
      fail(`Could not create function: ${e.message}`)
      if (e.code) info(`Code: ${e.code}`)
      if (e.type) info(`Type: ${e.type}`)
      if (e.response) info(`Details: ${JSON.stringify(e.response)}`)
      process.exit(1)
    }
  }

  info('Syncing function environment variables...')
  try {
    await syncVariables(fns, FN_ID, functionVariables)
  } catch (e) {
    fail(`Could not sync variables: ${e.message}`)
    if (e.code) info(`Code: ${e.code}`)
    if (e.type) info(`Type: ${e.type}`)
    process.exit(1)
  }

  info('Packing function code...')
  const fnSrc = join(__dir, 'appwrite-functions', 'replayCleanup')
  const tarOut = join(__dir, 'appwrite-functions', 'replayCleanup.tar.gz')

  const pkgPath = join(fnSrc, 'package.json')
  if (!existsSync(pkgPath)) {
    writeFileSync(pkgPath, JSON.stringify({
      name: 'replay-cleanup',
      type: 'module',
      dependencies: { 'node-appwrite': '^12.0.0' }
    }, null, 2))
    ok('Function package.json created')
  }

  try {
    execSync(`tar -czf "${tarOut}" -C "${fnSrc}" .`, { stdio: 'pipe' })
    ok('Code packed')
  } catch (e) {
    fail(`Could not pack code: ${e.message}`)
    process.exit(1)
  }

  info('Uploading deployment to Appwrite...')
  try {
    const tarBuffer = readFileSync(tarOut)
    const tarFile = InputFile.fromBuffer(tarBuffer, 'code.tar.gz')

    const deployment = await fns.createDeployment(
      FN_ID,
      tarFile,
      true,
      'index.js'
    )
    ok(`Deployment uploaded: ${deployment.$id}`)
  } catch (e) {
    fail(`Could not upload deployment: ${e.message}`)
    info('You can upload the archive manually from Appwrite Console:')
    info(`  ${tarOut}`)
    info('  Entrypoint: index.js')
    process.exit(1)
  }

  console.log(`\n  ${c.green}${c.bold}Function deployed.${c.reset}`)
  info(`ID: ${FN_ID}`)
  info(`Frontend env (optional): VITE_FUNCTION_REPLAY_CLEANUP=${FN_ID}`)
}

main().catch((e) => {
  fail(`Error: ${e.message}`)
  process.exit(1)
})

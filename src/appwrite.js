// src/appwrite.js
// Configuracion desde .env (VITE_*), con fallback para mantener compatibilidad.
export const APPWRITE_ENDPOINT  = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'
export const APPWRITE_PROJECT   = import.meta.env.VITE_APPWRITE_PROJECT || ''
export const DATABASE_ID        = import.meta.env.VITE_DATABASE_ID || 'chromasequence'
export const COLLECTION_DAILY   = import.meta.env.VITE_COLLECTION_DAILY || 'daily_challenges'
export const COLLECTION_RESULTS = import.meta.env.VITE_COLLECTION_RESULTS || 'game_results'
export const COLLECTION_STATS   = import.meta.env.VITE_COLLECTION_STATS || 'user_stats'
export const FUNCTION_REPLAY_CLEANUP = import.meta.env.VITE_FUNCTION_REPLAY_CLEANUP || 'replay-cleanup'

import { Client, Account, Databases, Functions } from 'appwrite'

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT)

export const account   = new Account(client)
export const databases = new Databases(client)
export const functions = new Functions(client)
export default client

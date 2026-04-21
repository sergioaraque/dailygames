import { defineStore } from 'pinia'
import { ref } from 'vue'
import { account } from '@/appwrite'
import { ID } from 'appwrite'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(false)

  async function fetchUser() {
    try {
      user.value = await account.get()
    } catch {
      user.value = null
    }
  }

  async function loginWithEmail(email, password) {
    loading.value = true
    try {
      await account.createEmailPasswordSession(email, password)
      await fetchUser()
    } finally {
      loading.value = false
    }
  }

  async function registerWithEmail(name, email, password) {
    loading.value = true
    try {
      await account.create(ID.unique(), email, password, name)
      await loginWithEmail(email, password)
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await account.deleteSession('current')
    user.value = null
  }

  return { user, loading, fetchUser, loginWithEmail, registerWithEmail, logout }
})

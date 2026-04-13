import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const KEY = 'huling_admin_token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(KEY))

  const isLoggedIn = computed(() => !!token.value)

  function setToken(t: string) {
    token.value = t
    localStorage.setItem(KEY, t)
  }

  function clear() {
    token.value = null
    localStorage.removeItem(KEY)
  }

  return { token, isLoggedIn, setToken, clear }
})

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(uni.getStorageSync('token') || '')
  const user = ref<authApi.MeUser | null>(null)

  const isLogin = computed(() => !!token.value)

  function setToken(t: string) {
    token.value = t
    if (t) uni.setStorageSync('token', t)
    else uni.removeStorageSync('token')
  }

  async function login(phone: string, password: string) {
    const data = await authApi.login(phone, password)
    setToken(data.token)
    user.value = { id: data.user.id, phone: data.user.phone, nickname: null }
    return data
  }

  function logout() {
    setToken('')
    user.value = null
  }

  async function loadProfile() {
    if (!token.value) return
    try {
      user.value = await authApi.fetchMe()
    } catch {
      logout()
    }
  }

  return { token, user, isLogin, setToken, login, logout, loadProfile }
})

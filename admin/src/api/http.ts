import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  return config
})

http.interceptors.response.use(
  (res) => {
    const d = res.data as { code?: number; message?: string; data?: unknown }
    if (d && typeof d === 'object' && 'code' in d) {
      if (d.code === 0) return d.data
      return Promise.reject(d)
    }
    return res.data
  },
  (err) => {
    const status = err.response?.status
    const body = err.response?.data
    if (status === 401) {
      const auth = useAuthStore()
      auth.clear()
      router.replace({ name: 'login' })
    }
    return Promise.reject(body ?? err)
  }
)

export async function adminLogin(username: string, password: string) {
  const data = (await http.post('/api/admin/login', {
    username,
    password,
  })) as { token: string; admin: { id: number; username: string } }
  return data
}

export async function adminChangePassword(old_password: string, new_password: string) {
  await http.put('/api/admin/password', { old_password, new_password })
}

export type AdminUser = {
  id: number
  phone: string
  nickname: string | null
  created_at: string
  updated_at: string
}

export async function fetchUsers() {
  return (await http.get('/api/admin/users')) as AdminUser[]
}

export async function updateUser(
  id: number,
  body: { phone?: string; nickname?: string | null; password?: string }
) {
  return (await http.put(`/api/admin/users/${id}`, body)) as AdminUser
}

export async function deleteUser(id: number) {
  await http.delete(`/api/admin/users/${id}`)
}

export type AdminVideo = {
  id: number
  title: string
  url: string
  sort_order: number
  duration_sec: number | null
  created_at: string
}

export async function fetchVideos() {
  return (await http.get('/api/admin/videos')) as AdminVideo[]
}

export async function updateVideo(
  id: number,
  body: Partial<{
    title: string
    url: string
    sort_order: number
    duration_sec: number | null
  }>
) {
  return (await http.put(`/api/admin/videos/${id}`, body)) as AdminVideo
}

export async function deleteVideo(id: number) {
  await http.delete(`/api/admin/videos/${id}`)
}

export default http

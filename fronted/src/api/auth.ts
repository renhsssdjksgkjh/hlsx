import { request, getApiBase, type ApiEnvelope } from './request'

export interface LoginRes {
  token: string
  user: { id: number; phone: string }
}

export function login(phone: string, password: string) {
  return request<LoginRes>({
    url: '/api/auth/login',
    method: 'POST',
    data: { phone, password },
    skipAuth: true,
  })
}

export function register(phone: string, password: string, nickname: string) {
  return request<{ id: number }>({
    url: '/api/auth/register',
    method: 'POST',
    data: { phone, password, nickname },
    skipAuth: true,
  })
}

export interface MeUser {
  id: number
  phone: string
  nickname: string | null
  /** 个人签名 */
  signature?: string | null
  /** 后端返回的相对路径，如 /uploads/avatars/1.jpg */
  avatar_url?: string | null
  created_at?: string
  updated_at?: string
}

/** 小程序 image 可用的完整 URL；无头像时返回默认 Tab 图标 */
export function userAvatarDisplaySrc(user: MeUser | null): string {
  const raw = user?.avatar_url
  if (!raw) return '/static/tab-mine.png'
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  return `${getApiBase()}${raw.startsWith('/') ? raw : `/${raw}`}`
}

export function fetchMe() {
  return request<MeUser>({ url: '/api/auth/me' })
}

export function changePassword(old_password: string, new_password: string) {
  return request<{ message?: string }>({
    url: '/api/user/password',
    method: 'PUT',
    data: { old_password, new_password },
  })
}

export function updateProfile(body: { nickname?: string | null; signature?: string | null }) {
  return request<MeUser>({
    url: '/api/user/profile',
    method: 'PUT',
    data: body as Record<string, unknown>,
  })
}

export function uploadAvatar(filePath: string): Promise<{ avatar_url: string }> {
  const token = uni.getStorageSync('token') as string
  if (!token) {
    return Promise.reject(new Error('未登录'))
  }
  const base = getApiBase()
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${base}/api/user/avatar`,
      filePath,
      name: 'file',
      header: {
        Authorization: `Bearer ${token}`,
      },
      success: (res) => {
        const status = res.statusCode || 0
        if (status === 401) {
          uni.removeStorageSync('token')
          uni.showToast({ title: '请重新登录', icon: 'none' })
          uni.reLaunch({ url: '/pages/login/login' })
          reject(new Error('401'))
          return
        }
        if (status >= 400) {
          try {
            const body = JSON.parse(res.data as string) as { message?: string }
            uni.showToast({ title: body?.message || '上传失败', icon: 'none' })
          } catch {
            uni.showToast({ title: '上传失败', icon: 'none' })
          }
          reject(new Error(String(status)))
          return
        }
        try {
          const parsed = JSON.parse(res.data as string) as ApiEnvelope<{ avatar_url: string }>
          if (parsed.code !== 0) {
            uni.showToast({ title: parsed.message || '上传失败', icon: 'none' })
            reject(parsed)
            return
          }
          if (!parsed.data?.avatar_url) {
            reject(new Error('no avatar_url'))
            return
          }
          resolve(parsed.data)
        } catch {
          reject(new Error('parse'))
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络异常', icon: 'none' })
        reject(err)
      },
    })
  })
}

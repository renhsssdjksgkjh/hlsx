const getBase = () => {
  const v = import.meta.env.VITE_API_BASE
  if (v) return v.replace(/\/$/, '')
  return 'http://localhost:3001'
}

export interface ApiEnvelope<T = unknown> {
  code: number
  message?: string
  data?: T
}

export function request<T = unknown>(options: {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, unknown>
  header?: Record<string, string>
  skipAuth?: boolean
}): Promise<T> {
  const token = options.skipAuth ? '' : uni.getStorageSync('token') as string
  const base = getBase()
  const fullUrl = options.url.startsWith('http') ? options.url : `${base}${options.url}`

  return new Promise((resolve, reject) => {
    uni.request({
      url: fullUrl,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.header,
      },
      success: (res) => {
        const status = res.statusCode || 0
        const body = res.data as ApiEnvelope<T>
        if (status === 401) {
          uni.removeStorageSync('token')
          uni.showToast({ title: '请重新登录', icon: 'none' })
          uni.reLaunch({ url: '/pages/login/login' })
          reject(new Error('401'))
          return
        }
        if (status >= 400) {
          reject(body || new Error(String(status)))
          return
        }
        if (body && typeof body === 'object' && 'code' in body) {
          if (body.code !== 0) {
            uni.showToast({ title: body.message || '请求失败', icon: 'none' })
            reject(body)
            return
          }
          resolve(body.data as T)
          return
        }
        resolve(body as T)
      },
      fail: (err) => {
        uni.showToast({ title: '网络异常', icon: 'none' })
        reject(err)
      },
    })
  })
}

import { request } from './request'

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
  created_at?: string
  updated_at?: string
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

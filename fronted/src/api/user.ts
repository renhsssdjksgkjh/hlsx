import { request } from './request'

export interface MineStats {
  course_total: number
  course_completed: number
  quiz_attempts: number
  wrong_count: number
  last_quiz: {
    video_title: string
    score: number
    total: number
    created_at: string
  } | null
}

export function fetchMineStats() {
  return request<MineStats>({ url: '/api/user/stats' })
}

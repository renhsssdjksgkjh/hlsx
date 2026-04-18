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

export interface QuizRecordRow {
  id: number
  video_id: number
  video_title: string
  score: number
  total: number
  created_at: string
}

export function fetchQuizRecords(limit = 5) {
  return request<{ list: QuizRecordRow[] }>({
    url: `/api/user/quiz-records?limit=${encodeURIComponent(String(limit))}`,
  })
}

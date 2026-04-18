import { request } from './request'

export interface LatestQuiz {
  score: number
  total: number
  created_at: string
}

export interface VideoItem {
  id: number
  title: string
  url: string
  sort_order: number
  duration_sec?: number | null
  created_at?: string
  /** 当前用户本课最近一次测验，无记录时为 null */
  latest_quiz?: LatestQuiz | null
}

export function getVideos() {
  return request<VideoItem[]>({ url: '/api/videos' })
}

export function getVideo(id: number) {  
  return request<VideoItem>({ url: `/api/videos/${id}` })
}

export function getProgress(videoId: number) {
  return request<{ position_sec: number }>({ url: `/api/videos/${videoId}/progress` })
}

export function saveProgress(videoId: number, position_sec: number) {
  return request<{ position_sec: number }>({
    url: `/api/videos/${videoId}/progress`,
    method: 'PUT',
    data: { position_sec },
  })
}

export interface QuestionItem {
  id: number
  video_id: number
  type: string
  content: string
  options: unknown
  sort_order: number
}

export function getQuestions(videoId: number) {
  return request<QuestionItem[]>({ url: `/api/videos/${videoId}/questions` })
}

export interface QuizDetail {
  question_id: number
  type: string
  is_correct: boolean
  correct_answer: unknown
  analysis: string | null
}

export interface QuizSubmitRes {
  video_id: number
  score: number
  total: number
  correct: number
  details: QuizDetail[]
}

export function submitQuiz(videoId: number, answers: { question_id: number; user_answer: unknown }[]) {
  return request<QuizSubmitRes>({
    url: `/api/videos/${videoId}/quiz/submit`,
    method: 'POST',
    data: { answers },
  })
}

import { request } from './request'

export interface WrongQuestionItem {
  question_id: number
  video_id: number
  video_title: string
  video_sort_order?: number
  type: string
  content: string
  options: unknown
  analysis: string | null
  correct_answer: unknown
  last_wrong_at: string
}

export function getWrongQuestions() {
  return request<WrongQuestionItem[]>({ url: '/api/quiz/wrong' })
}

export function getWrongQuestionDetail(questionId: number) {
  return request<WrongQuestionItem>({ url: `/api/quiz/wrong/${questionId}` })
}

export function removeWrongQuestion(questionId: number) {
  return request<null>({ url: `/api/quiz/wrong/${questionId}`, method: 'DELETE' })
}

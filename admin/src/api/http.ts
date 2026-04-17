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

export type AdminStats = {
  userCount: number
  videoCount: number
  quizRecordCount: number
  questionCount: number
}

export async function fetchStats() {
  return (await http.get('/api/admin/stats')) as AdminStats
}

export type UserQuizAvgRow = {
  user_id: number
  label: string
  /** 无测验记录时为 null */
  avgAccuracy: number | null
  quizCount: number
}

export type VideoQuizAvgRow = {
  video_id: number
  video_title: string
  /** 无测验记录时为 null */
  avgAccuracy: number | null
  attemptCount: number
}

export type AdminChartStats = {
  userQuizAvg: UserQuizAvgRow[]
  videoQuizAvg: VideoQuizAvgRow[]
}

export async function fetchChartStats() {
  return (await http.get('/api/admin/stats/charts')) as AdminChartStats
}

export type QuestionStemRow = {
  id: number
  video_id: number
  video_title: string
  type: string
  content: string
  sort_order: number
}

export type AdminQuestionsPreviewData = {
  list: QuestionStemRow[]
  total: number
  limit: number
  offset: number
}

/** 全部题目题干（无选项与答案，分页） */
export async function fetchAllQuestionsPreview(params?: { limit?: number; offset?: number }) {
  return (await http.get('/api/admin/questions', { params })) as AdminQuestionsPreviewData
}

export type AdminQuizSubmissionRow = {
  id: number
  user_id: number
  user_label: string
  phone: string
  video_id: number
  video_title: string
  score: number
  total: number
  created_at: string
}

export type AdminQuizRecordsData = {
  list: AdminQuizSubmissionRow[]
  total: number
  limit: number
  offset: number
}

/** 全站测验提交记录（分页） */
export async function fetchAllQuizRecords(params?: { limit?: number; offset?: number }) {
  return (await http.get('/api/admin/quiz-records', { params })) as AdminQuizRecordsData
}

export type AdminUser = {
  id: number
  phone: string
  nickname: string | null
  created_at: string
  updated_at: string
}

export type Paginated<T> = {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export async function fetchUsers(params?: { page?: number; pageSize?: number; q?: string }) {
  return (await http.get('/api/admin/users', { params })) as Paginated<AdminUser>
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

export type LearningVideoRow = {
  video_id: number
  title: string
  sort_order: number
  duration_sec: number | null
  position_sec: number
  progress_percent: number | null
  finished_watching: boolean
  latest_quiz: {
    score: number
    total: number
    created_at: string
    accuracy: number | null
  } | null
}

export type UserLearningData = {
  videos: LearningVideoRow[]
}

export async function fetchUserLearning(userId: number) {
  return (await http.get(`/api/admin/users/${userId}/learning`)) as UserLearningData
}

export type QuizRecordRow = {
  id: number
  video_id: number
  video_title: string
  score: number
  total: number
  accuracy: number | null
  created_at: string
}

export type QuizRecordsData = {
  list: QuizRecordRow[]
  total: number
  limit: number
  offset: number
}

export async function fetchUserQuizRecords(userId: number, params?: { limit?: number; offset?: number }) {
  return (await http.get(`/api/admin/users/${userId}/quiz-records`, { params })) as QuizRecordsData
}

export type AdminVideo = {
  id: number
  title: string
  url: string
  sort_order: number
  duration_sec: number | null
  created_at: string
}

export async function fetchVideos(params?: { page?: number; pageSize?: number; q?: string }) {
  return (await http.get('/api/admin/videos', { params })) as Paginated<AdminVideo>
}

export type AdminQuestion = {
  id: number
  video_id: number
  type: string
  content: string
  options: unknown
  correct_answer: unknown
  analysis: string | null
  sort_order: number
}

export async function fetchVideoQuestions(videoId: number) {
  return (await http.get(`/api/admin/videos/${videoId}/questions`)) as AdminQuestion[]
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

export type AdminNoticeRow = {
  id: number
  title: string
  body: string
  created_at: string
  published_at: string | null
  target_type: 'all' | 'selected'
  admin_id: number
  admin_username: string
}

export async function fetchNotices(params?: { page?: number; pageSize?: number }) {
  return (await http.get('/api/admin/notices', { params })) as Paginated<AdminNoticeRow>
}

export type AdminNoticeDetail = AdminNoticeRow & { user_ids: number[] }

export async function fetchNotice(id: number) {
  return (await http.get(`/api/admin/notices/${id}`)) as AdminNoticeDetail
}

export async function createNotice(body: {
  title: string
  body: string
  target_type: 'all' | 'selected'
  user_ids?: number[]
  publish: boolean
}) {
  return (await http.post('/api/admin/notices', body)) as AdminNoticeDetail
}

export async function updateNotice(
  id: number,
  body: {
    title: string
    body: string
    target_type: 'all' | 'selected'
    user_ids?: number[]
    publish: boolean
  }
) {
  return (await http.put(`/api/admin/notices/${id}`, body)) as AdminNoticeDetail
}

export async function deleteNotice(id: number) {
  await http.delete(`/api/admin/notices/${id}`)
}

export async function publishNotice(id: number) {
  return (await http.post(`/api/admin/notices/${id}/publish`)) as AdminNoticeRow
}

export default http

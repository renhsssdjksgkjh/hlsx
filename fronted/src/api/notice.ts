import { request } from './request'

export type NoticeListItem = {
  id: number
  title: string
  created_at: string
}

export type NoticeDetail = NoticeListItem & {
  body: string
  published_at: string
}

export function fetchNoticeList() {
  return request<{ list: NoticeListItem[] }>({ url: '/api/user/notices' })
}

export function fetchNoticeDetail(id: number) {
  return request<NoticeDetail>({ url: `/api/user/notices/${id}` })
}

<template>
  <view class="page">
    <view v-if="loading" class="loading-wrap">
      <u-loading-icon mode="circle" size="28" color="#ff7000" />
      <u-gap height="12" />
      <u-text text="加载中…" type="tips" size="14" align="center" />
    </view>
    <scroll-view v-else-if="detail" scroll-y class="scroll" :show-scrollbar="false">
      <u-card :show-head="false" :show-foot="false" margin="12px 15px" :border-radius="12">
        <template #body>
          <u-text :text="detail.video_title" type="tips" size="12" color="#909399" />
          <u-gap height="8" />
          <u-tag :text="typeLabel(detail.type)" type="warning" plain size="mini" />
          <u-gap height="12" />
          <u-text :text="detail.content" size="16" color="#303133" bold :lines="0" />
        </template>
      </u-card>

      <u-card v-if="parseOpts(detail.options).length" :show-head="false" :show-foot="false" margin="12px 15px" :border-radius="12">
        <template #body>
          <u-text text="选项" size="14" bold color="#303133" />
          <u-gap height="10" />
          <view v-for="opt in parseOpts(detail.options)" :key="opt.key" class="opt-line">
            <u-text :text="`${opt.key}. ${opt.text}`" size="14" color="#606266" :lines="0" />
          </view>
        </template>
      </u-card>

      <u-card :show-head="false" :show-foot="false" margin="12px 15px" :border-radius="12">
        <template #body>
          <u-text text="正确答案" size="14" bold color="#ff7000" />
          <u-gap height="8" />
          <u-text :text="formatAnswer(detail)" size="15" color="#303133" :lines="0" />
        </template>
      </u-card>

      <u-card :show-head="false" :show-foot="false" margin="12px 15px" :border-radius="12">
        <template #body>
          <u-text text="解析" size="14" bold color="#ff7000" />
          <u-gap height="8" />
          <u-text :text="detail.analysis || '（无）'" size="14" color="#606266" :lines="0" />
        </template>
      </u-card>
      <u-gap height="32" />
    </scroll-view>
    <view v-else class="empty-state">
      <u-empty mode="data" text="加载失败" margin-top="80" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import * as quizApi from '@/api/quiz'

const loading = ref(true)
const detail = ref<quizApi.WrongQuestionItem | null>(null)
const questionId = ref(0)

function norm(t: string) {
  return (t || '').trim()
}
function isSingle(t: string) {
  const s = norm(t).toLowerCase()
  if (s === 'single' || s === 'single_choice') return true
  const u = norm(t)
  return u === '单选题' || u === '单选'
}
function isMulti(t: string) {
  const s = norm(t).toLowerCase()
  if (s === 'multi' || s === 'multiple' || s === 'multiple_choice') return true
  const u = norm(t)
  return u === '多选题' || u === '多选'
}
function isJudge(t: string) {
  const s = norm(t).toLowerCase()
  if (s === 'judge' || s === 'judgment' || s === 'true_false') return true
  const u = norm(t)
  return u === '判断题' || u === '判断'
}
function typeLabel(t: string) {
  if (isSingle(t)) return '单选题'
  if (isMulti(t)) return '多选题'
  if (isJudge(t)) return '判断题'
  return t
}

function unwrapPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw
  const o = raw as Record<string, unknown>
  if (o.type === 'Buffer' && Array.isArray(o.data)) {
    try {
      const u8 = new Uint8Array(o.data as number[])
      const str = new TextDecoder('utf-8').decode(u8)
      return JSON.parse(str)
    } catch {
      return raw
    }
  }
  const nested = o.list ?? o.items ?? o.choices ?? o.optionList
  if (nested != null) return nested
  return raw
}

function parseOpts(raw: unknown): { key: string; text: string }[] {
  let data: unknown = raw
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch {
      return []
    }
  }
  data = unwrapPayload(data)
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      return []
    }
  }
  data = unwrapPayload(data)

  if (Array.isArray(data)) {
    return data.map((o, i) => {
      if (o && typeof o === 'object' && 'key' in o && 'text' in o) {
        return { key: String((o as { key: string }).key), text: String((o as { text: string }).text) }
      }
      const k = String.fromCharCode(65 + i)
      return { key: k, text: String(o) }
    })
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>
    const entries = Object.entries(obj)
    entries.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    return entries.map(([key, val]) => ({
      key,
      text:
        typeof val === 'object' && val !== null && 'text' in val
          ? String((val as { text: unknown }).text)
          : String(val ?? ''),
    }))
  }
  return []
}

function formatAnswer(d: quizApi.WrongQuestionItem): string {
  const ca = d.correct_answer
  if (isJudge(d.type)) {
    if (ca === true || ca === 'true' || ca === 1) return '正确'
    if (ca === false || ca === 'false' || ca === 0) return '错误'
    return String(ca)
  }
  if (Array.isArray(ca)) return ca.join('、')
  if (ca != null && typeof ca === 'object') return JSON.stringify(ca)
  return ca === undefined || ca === null ? '—' : String(ca)
}

onLoad((q: Record<string, string | undefined>) => {
  if (!uni.getStorageSync('token')) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  questionId.value = Number(q.id ?? '') || 0
  if (!questionId.value) {
    uni.showToast({ title: '参数错误', icon: 'none' })
    return
  }
  load()
})

async function load() {
  loading.value = true
  detail.value = null
  try {
    detail.value = await quizApi.getWrongQuestionDetail(questionId.value)
  } catch {
    detail.value = null
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding-bottom: env(safe-area-inset-bottom);
}
.scroll {
  max-height: calc(100vh - 20rpx);
  box-sizing: border-box;
}
.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}
.empty-state {
  padding-top: 80rpx;
}
.opt-line {
  margin-bottom: 8rpx;
}
.opt-line:last-child {
  margin-bottom: 0;
}
</style>

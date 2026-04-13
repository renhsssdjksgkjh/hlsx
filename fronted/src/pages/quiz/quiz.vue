<template>
  <view class="page">
    <view v-if="loading" class="loading-wrap">
      <u-loading-icon mode="circle" size="28" color="#ff7000" />
      <u-gap height="12" />
      <u-text text="加载题目…" type="tips" size="14" align="center" />
    </view>
    <u-empty v-else-if="!questions.length" mode="data" text="暂无题目" margin-top="80" />
    <scroll-view v-else-if="!result" scroll-y class="scroll">
      <u-card
        v-for="(q, idx) in questions"
        :key="q.id"
        :show-head="false"
        :show-foot="false"
        margin="12px 15px"
        :border-radius="12"
        :box-shadow="'0 4rpx 20rpx rgba(0,0,0,0.06)'"
      >
        <template #body>
          <u-text :text="`${idx + 1}. ${q.content}`" size="15" color="#303133" :lines="0" />
          <u-gap height="10" />
          <u-tag :text="typeLabel(q.type)" type="warning" plain size="mini" />
          <u-gap height="16" />

          <view v-if="isSingle(q.type)" class="opts-col">
            <u-button
              v-for="opt in parseOpts(q.options)"
              :key="opt.key"
              :text="`${opt.key}. ${opt.text}`"
              :type="singleMap[q.id] === opt.key ? 'primary' : 'info'"
              :plain="singleMap[q.id] !== opt.key"
              size="normal"
              :custom-style="optBtnStyle"
              @click="singleMap[q.id] = opt.key"
            />
            <u-text
              v-if="!parseOpts(q.options).length"
              text="暂无选项，请检查题库中 options 字段"
              type="tips"
              size="12"
            />
          </view>

          <view v-else-if="isMulti(q.type)" class="opts-col">
            <u-button
              v-for="opt in parseOpts(q.options)"
              :key="opt.key"
              :text="`${opt.key}. ${opt.text}`"
              :type="(multiMap[q.id] || []).includes(opt.key) ? 'primary' : 'info'"
              :plain="!(multiMap[q.id] || []).includes(opt.key)"
              size="normal"
              :custom-style="optBtnStyle"
              @click="toggleMulti(q.id, opt.key)"
            />
            <u-text
              v-if="!parseOpts(q.options).length"
              text="暂无选项，请检查题库中 options 字段"
              type="tips"
              size="12"
            />
          </view>

          <view v-else-if="isJudge(q.type)" class="judge-row">
            <u-button
              text="正确"
              :type="judgeMap[q.id] === true ? 'primary' : 'info'"
              :plain="judgeMap[q.id] !== true"
              size="normal"
              :custom-style="{ flex: 1, marginRight: '6px' }"
              @click="judgeMap[q.id] = true"
            />
            <u-button
              text="错误"
              :type="judgeMap[q.id] === false ? 'primary' : 'info'"
              :plain="judgeMap[q.id] !== false"
              size="normal"
              :custom-style="{ flex: 1, marginLeft: '6px' }"
              @click="judgeMap[q.id] = false"
            />
          </view>
        </template>
      </u-card>
      <view class="submit-wrap">
        <u-button
          text="提交答卷"
          type="primary"
          size="large"
          :loading="submitting"
          :custom-style="{ width: 'calc(100% - 48rpx)' }"
          @click="onSubmit"
        />
      </view>
    </scroll-view>

    <scroll-view v-else scroll-y class="scroll res">
      <u-card :show-head="false" :show-foot="false" margin="12px 15px" :border-radius="12">
        <template #body>
          <u-text :text="`得分 ${result!.correct} / ${result!.total}`" size="20" bold color="#ff7000" align="center" />
        </template>
      </u-card>
      <u-card
        v-for="d in result!.details"
        :key="d.question_id"
        :show-head="false"
        :show-foot="false"
        margin="12px 15px"
        :border-radius="12"
      >
        <template #body>
          <view class="row">
            <u-text :text="d.is_correct ? '正确' : '错误'" :color="d.is_correct ? '#ff7000' : '#f56c6c'" bold size="14" />
            <u-tag :text="typeLabel(d.type)" type="warning" plain size="mini" />
          </view>
          <u-gap height="12" />
          <u-text :text="`解析：${d.analysis || '（无）'}`" size="13" color="#555" :lines="0" />
        </template>
      </u-card>
      <view class="submit-wrap">
        <u-button text="返回课程" type="primary" size="large" :custom-style="{ width: 'calc(100% - 48rpx)' }" @click="back" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import * as videoApi from '@/api/video'

const optBtnStyle = { width: '100%', marginBottom: '8px' }

const videoId = ref(0)
const loading = ref(true)
const submitting = ref(false)
const questions = ref<videoApi.QuestionItem[]>([])
const singleMap = reactive<Record<number, string>>({})
const multiMap = reactive<Record<number, string[]>>({})
const judgeMap = reactive<Record<number, boolean | undefined>>({})
const result = ref<videoApi.QuizSubmitRes | null>(null)

onLoad((q: Record<string, string | undefined>) => {
  if (!uni.getStorageSync('token')) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  videoId.value = Number(q.id ?? '') || 0
  if (!videoId.value) {
    uni.showToast({ title: '参数错误', icon: 'none' })
    return
  }
  load()
})

function errMessage(e: unknown) {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: string }).message
    if (m) return m
  }
  return '加载失败'
}

async function load() {
  loading.value = true
  try {
    questions.value = await videoApi.getQuestions(videoId.value)
    questions.value.forEach((q) => {
      if (isJudge(q.type)) judgeMap[q.id] = undefined
    })
  } catch (e) {
    questions.value = []
    uni.showToast({ title: errMessage(e), icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1600)
  } finally {
    loading.value = false
  }
}

/** 兼容 Express 将 Buffer 序列化成 { type, data } 的 JSON */
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
    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return []
    }
    const entries = Object.entries(obj)
    entries.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    return entries.map(([key, val]) => ({
      key,
      text: typeof val === 'object' && val !== null && 'text' in val
        ? String((val as { text: unknown }).text)
        : String(val ?? ''),
    }))
  }
  return []
}

function norm(t: string) {
  return (t || '').trim()
}

/** 与后端 normalizeType / 常见题库习惯一致，兼容中英文 type 存库 */
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

function toggleMulti(qid: number, key: string) {
  const arr = multiMap[qid] || []
  const i = arr.indexOf(key)
  if (i >= 0) multiMap[qid] = arr.filter((k) => k !== key)
  else multiMap[qid] = [...arr, key]
}

function buildAnswers(): { question_id: number; user_answer: unknown }[] {
  const list: { question_id: number; user_answer: unknown }[] = []
  for (const q of questions.value) {
    if (isSingle(q.type)) {
      const v = singleMap[q.id]
      if (v === undefined || v === '') {
        uni.showToast({ title: '请完成所有题目', icon: 'none' })
        throw new Error('incomplete')
      }
      list.push({ question_id: q.id, user_answer: v })
    } else if (isMulti(q.type)) {
      const v = multiMap[q.id] || []
      if (!v.length) {
        uni.showToast({ title: '请完成所有题目', icon: 'none' })
        throw new Error('incomplete')
      }
      list.push({ question_id: q.id, user_answer: v })
    } else if (isJudge(q.type)) {
      const v = judgeMap[q.id]
      if (v === undefined) {
        uni.showToast({ title: '请完成所有题目', icon: 'none' })
        throw new Error('incomplete')
      }
      list.push({ question_id: q.id, user_answer: v })
    }
  }
  return list
}

async function onSubmit() {
  let answers: { question_id: number; user_answer: unknown }[] = []
  try {
    answers = buildAnswers()
  } catch {
    return
  }
  submitting.value = true
  try {
    result.value = await videoApi.submitQuiz(videoId.value, answers)
  } catch (e) {
    uni.showToast({ title: errMessage(e), icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function back() {
  uni.navigateBack({ delta: 1 })
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
}
.scroll {
  max-height: calc(100vh - 40rpx);
  padding-bottom: 48rpx;
}
.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}
.opts-col {
  display: flex;
  flex-direction: column;
}
.judge-row {
  display: flex;
  align-items: stretch;
  margin-top: 8rpx;
}
.submit-wrap {
  margin: 32rpx 24rpx 80rpx;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

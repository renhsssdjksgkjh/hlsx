<template>
  <view class="page">
    <u-card v-if="detail" :show-head="false" :show-foot="false" margin="12px 15px" :border-radius="12">
      <template #body>
        <u-text :text="detail.title" size="16" bold color="#303133" :lines="3" />
      </template>
    </u-card>
    <view v-if="videoSrc" class="video-section">
      <video
        id="courseVideo"
        :key="videoId"
        class="video"
        :src="videoSrc"
        :show-progress="false"
        :enable-progress-gesture="false"
        controls
        preload="none"
        show-center-play-btn
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
      />
      <view
        class="fox-progress"
        @touchstart.stop.prevent="onScrubTouchStart"
        @touchmove.stop.prevent="onScrubTouchMove"
        @touchend.stop="onScrubTouchEnd"
        @touchcancel.stop="onScrubTouchEnd"
      >
        <view id="progressTrack" class="fox-progress__track">
          <view class="fox-progress__fill" :style="{ width: displayPercent + '%' }" />
          <image
            class="fox-progress__thumb"
            src="/static/fox-logo.png"
            mode="aspectFit"
            :style="{ left: displayPercent + '%' }"
          />
        </view>
      </view>
    </view>

    <view v-if="detail" class="nav-row">
      <view class="nav-btn-wrap">
        <u-button
          type="primary"
          plain
          size="normal"
          class="nav-lesson-btn"
          :disabled="!prevVideo"
          @click="goPrev"
        >
          <view class="nav-btn-inner">
            <u-icon name="arrow-left" size="20" :color="prevVideo ? '#ff7000' : '#c0c4cc'" />
            <text class="nav-btn-label">上一课</text>
          </view>
        </u-button>
        <text v-if="prevVideo && neighborPrevDone !== null" class="nav-hint">
          {{ neighborPrevDone ? '已学完' : '未学完' }}
        </text>
      </view>
      <view class="nav-btn-wrap">
        <u-button
          type="primary"
          plain
          size="normal"
          class="nav-lesson-btn"
          :disabled="!nextVideo"
          @click="goNext"
        >
          <view class="nav-btn-inner">
            <text class="nav-btn-label">下一课</text>
            <u-icon name="arrow-right" size="20" :color="nextVideo ? '#ff7000' : '#c0c4cc'" />
          </view>
        </u-button>
        <text v-if="nextVideo && neighborNextDone !== null" class="nav-hint">
          {{ neighborNextDone ? '已学完' : '未学完' }}
        </text>
      </view>
    </view>

    <view v-if="detail" class="bottom-cards">
      <view class="info-card">
        <text class="info-card__title">本课测验</text>
        <text v-if="detail.latest_quiz" class="info-card__body">
          最近得分 {{ detail.latest_quiz.score }}/{{ detail.latest_quiz.total }}（{{ formatTime(detail.latest_quiz.created_at) }}）
        </text>
        <text v-else class="info-card__body muted">尚未测验</text>
      </view>

      <view v-if="quizRecords.length" class="info-card">
        <text class="info-card__title">最近测验</text>
        <view
          v-for="row in quizRecordsPreview"
          :key="row.id"
          class="quiz-row"
          @click="openQuiz(row.video_id)"
        >
          <text class="quiz-row__title">{{ row.video_title }}</text>
          <text class="quiz-row__meta">{{ row.score }}/{{ row.total }} · {{ formatTime(row.created_at) }}</text>
        </view>
        <text v-if="showQuizRecordsMore" class="quiz-records-more" @click="goQuizHistory">查看全部测验 ›</text>
      </view>

      <view v-if="mineStats" class="info-card stats-card" @click="goProgressPage">
        <text class="info-card__title">学习概览</text>
        <text class="info-card__body">
          已完成 {{ mineStats.course_completed }}/{{ mineStats.course_total }} 课 · 测验 {{ mineStats.quiz_attempts }} 次 · 错题
          {{ mineStats.wrong_count }} 道
        </text>
        <text class="stats-card__link">查看学习进度 ›</text>
      </view>
    </view>

    <view class="actions">
      <u-button type="primary" size="large" :custom-style="{ width: '100%' }" @click="goQuiz">
        <view class="quiz-btn-inner">
          <view class="quiz-icon-order" aria-hidden="true">
            <view class="quiz-icon-order-line" />
            <view class="quiz-icon-order-line" />
            <view class="quiz-icon-order-line" />
          </view>
          <text class="quiz-btn-text">学完去测验</text>
          <view class="quiz-icon-arrow-r" aria-hidden="true" />
        </view>
      </u-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, getCurrentInstance } from 'vue'
import { onLoad, onUnload, onHide } from '@dcloudio/uni-app'
import * as videoApi from '@/api/video'
import { fetchMineStats, fetchQuizRecords, type MineStats, type QuizRecordRow } from '@/api/user'

const videoId = ref(0)
const detail = ref<videoApi.VideoItem | null>(null)
const videoSrc = ref('')
const startSec = ref(0)
const lastSec = ref(0)
let lastReport = 0
let ctx: UniApp.VideoContext | null = null

const currentTimeFloat = ref(0)
const durationSec = ref(0)
const isDragging = ref(false)
const dragPercent = ref(0)
let scrubTrackRect: { left: number; width: number } | null = null
let lastSeekAt = 0
const SEEK_THROTTLE_MS = 180

const END_TOL_SEC = 3
const NO_DURATION_MIN_SEC = 30

const prevVideo = ref<{ id: number; title: string } | null>(null)
const nextVideo = ref<{ id: number; title: string } | null>(null)
const neighborPrevDone = ref<boolean | null>(null)
const neighborNextDone = ref<boolean | null>(null)

const mineStats = ref<MineStats | null>(null)
const quizRecords = ref<QuizRecordRow[]>([])

const proxy = getCurrentInstance()?.proxy

const displayPercent = computed(() => {
  const dur = durationSec.value || Number(detail.value?.duration_sec) || 0
  if (isDragging.value) return dragPercent.value
  if (dur <= 0) return 0
  return Math.min(100, (currentTimeFloat.value / dur) * 100)
})

const quizRecordsPreview = computed(() => quizRecords.value.slice(0, 2))
const showQuizRecordsMore = computed(() => quizRecords.value.length > 2)

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

function pauseVideo() {
  try {
    uni.createVideoContext('courseVideo').pause()
  } catch {
    //
  }
}

onHide(() => {
  pauseVideo()
})

onUnload(() => {
  pauseVideo()
  if (videoId.value && lastSec.value >= 0) {
    videoApi.saveProgress(videoId.value, lastSec.value).catch(() => {})
  }
})

function scheduleSecondaryLoad() {
  nextTick(() => {
    setTimeout(() => {
      void loadNavNeighborsAndBottom()
    }, 0)
  })
}

function isLessonCompleted(pos: number, durSec: number | null | undefined): boolean {
  const dur = Number(durSec) || 0
  if (dur > 0) return pos >= dur - END_TOL_SEC
  return pos >= NO_DURATION_MIN_SEC
}

async function loadNavNeighborsAndBottom() {
  try {
    const list = await videoApi.getVideos()
    const idx = list.findIndex((v) => v.id === videoId.value)
    neighborPrevDone.value = null
    neighborNextDone.value = null
    if (idx < 0) {
      prevVideo.value = null
      nextVideo.value = null
    } else {
      const p = idx > 0 ? list[idx - 1] : null
      const n = idx < list.length - 1 ? list[idx + 1] : null
      prevVideo.value = p ? { id: p.id, title: p.title } : null
      nextVideo.value = n ? { id: n.id, title: n.title } : null
      if (p) {
        videoApi
          .getProgress(p.id)
          .then((pr) => {
            neighborPrevDone.value = isLessonCompleted(pr.position_sec, p.duration_sec)
          })
          .catch(() => {
            neighborPrevDone.value = null
          })
      }
      if (n) {
        videoApi
          .getProgress(n.id)
          .then((pr) => {
            neighborNextDone.value = isLessonCompleted(pr.position_sec, n.duration_sec)
          })
          .catch(() => {
            neighborNextDone.value = null
          })
      }
    }
  } catch {
    prevVideo.value = null
    nextVideo.value = null
  }

  try {
    const [stats, rec] = await Promise.all([fetchMineStats(), fetchQuizRecords(3)])
    mineStats.value = stats
    quizRecords.value = rec.list || []
  } catch {
    mineStats.value = null
    quizRecords.value = []
  }
}

async function load() {
  videoSrc.value = ''
  currentTimeFloat.value = 0
  durationSec.value = 0
  detail.value = null
  mineStats.value = null
  quizRecords.value = []
  prevVideo.value = null
  nextVideo.value = null
  neighborPrevDone.value = null
  neighborNextDone.value = null
  try {
    const d = await videoApi.getVideo(videoId.value)
    detail.value = d
    const url = (d.url || '').trim()
    if (!url) {
      detail.value = null
      return
    }
    videoSrc.value = url
    const durApi = Number(d.duration_sec)
    if (durApi > 0) durationSec.value = Math.floor(durApi)
    startSec.value = 0
    videoApi
      .getProgress(videoId.value)
      .then((prog) => {
        startSec.value = prog.position_sec || 0
        const c = uni.createVideoContext('courseVideo')
        ctx = c
        if (startSec.value > 0) {
          nextTick(() => c.seek(startSec.value))
        }
      })
      .catch(() => {})
    scheduleSecondaryLoad()
  } catch {
    detail.value = null
    videoSrc.value = ''
  }
}

function onLoadedMetadata(e: Event) {
  const payload = (e as unknown as { detail?: { duration?: number } }).detail
  const d = Number(payload?.duration)
  if (d > 0) durationSec.value = Math.floor(d)
  ctx = uni.createVideoContext('courseVideo')
  if (startSec.value > 0 && ctx) {
    ctx.seek(startSec.value)
  }
}

function onTimeUpdate(e: Event) {
  if (isDragging.value) return
  const payload = (e as unknown as { detail?: { currentTime?: number } }).detail
  const t = Number(payload?.currentTime ?? 0)
  currentTimeFloat.value = t
  const sec = Math.floor(t)
  lastSec.value = sec
  const now = Date.now()
  if (now - lastReport < 4000) return
  lastReport = now
  videoApi.saveProgress(videoId.value, sec).catch(() => {})
}

function getDurationForSeek(): number {
  return durationSec.value || Number(detail.value?.duration_sec) || 0
}

function seekToRatio(ratio: number) {
  const dur = getDurationForSeek()
  if (dur <= 0) return
  const r = Math.min(1, Math.max(0, ratio))
  const pos = r * dur
  if (!ctx) ctx = uni.createVideoContext('courseVideo')
  ctx?.seek(pos)
  currentTimeFloat.value = pos
  lastSec.value = Math.floor(pos)
}

function measureTrack(cb: (rect: { left: number; width: number } | null) => void) {
  const q = uni.createSelectorQuery()
  if (proxy) q.in(proxy)
  q.select('#progressTrack').boundingClientRect()
  q.exec((res) => {
    const rect = (res as UniApp.NodeInfo[] | null)?.[0]
    if (rect && typeof rect === 'object' && 'width' in rect && Number(rect.width) > 0) {
      cb({ left: Number(rect.left), width: Number(rect.width) })
    } else {
      cb(null)
    }
  })
}

function clientXToRatio(clientX: number, rect: { left: number; width: number }) {
  return (clientX - rect.left) / rect.width
}

function onScrubTouchStart(e: TouchEvent) {
  const t = e.touches?.[0]
  if (!t) return
  isDragging.value = true
  measureTrack((rect) => {
    scrubTrackRect = rect
    if (!rect) return
    const ratio = clientXToRatio(t.clientX, rect)
    dragPercent.value = Math.min(100, Math.max(0, ratio * 100))
    maybeThrottledSeek(ratio)
  })
}

function onScrubTouchMove(e: TouchEvent) {
  if (!isDragging.value) return
  const t = e.touches?.[0]
  if (!t) return
  const rect = scrubTrackRect
  if (!rect) {
    measureTrack((r) => {
      scrubTrackRect = r
    })
    return
  }
  const ratio = clientXToRatio(t.clientX, rect)
  dragPercent.value = Math.min(100, Math.max(0, ratio * 100))
  maybeThrottledSeek(ratio)
}

function onScrubTouchEnd() {
  if (!isDragging.value) return
  const rect = scrubTrackRect
  isDragging.value = false
  scrubTrackRect = null
  const ratio = dragPercent.value / 100
  seekToRatio(ratio)
  lastSeekAt = 0
}

function maybeThrottledSeek(ratio: number) {
  const now = Date.now()
  if (now - lastSeekAt < SEEK_THROTTLE_MS) return
  lastSeekAt = now
  seekToRatio(ratio)
}

function goPrev() {
  if (!prevVideo.value) return
  uni.redirectTo({ url: `/pages/video/play?id=${prevVideo.value.id}` })
}

function goNext() {
  if (!nextVideo.value) return
  uni.redirectTo({ url: `/pages/video/play?id=${nextVideo.value.id}` })
}

function formatTime(iso: string) {
  if (!iso) return ''
  return String(iso).slice(0, 10)
}

function openQuiz(vid: number) {
  uni.navigateTo({ url: `/pages/quiz/quiz?id=${vid}` })
}

function goQuizHistory() {
  uni.navigateTo({ url: '/pages/quiz/quiz-history' })
}

function goProgressPage() {
  uni.switchTab({ url: '/pages/progress/progress' })
}

async function goQuiz() {
  if (!detail.value || !videoId.value) return
  try {
    const prog = await videoApi.getProgress(videoId.value)
    const dur = Number(detail.value.duration_sec) || 0
    const pos = prog.position_sec || 0
    if (dur > 0) {
      if (pos < dur - END_TOL_SEC) {
        uni.showToast({ title: '请先完整观看视频后再测验', icon: 'none' })
        return
      }
    } else if (pos < NO_DURATION_MIN_SEC) {
      uni.showToast({ title: '请观看视频后再测验', icon: 'none' })
      return
    }
  } catch {
    uni.showToast({ title: '无法校验学习进度', icon: 'none' })
    return
  }
  uni.navigateTo({ url: `/pages/quiz/quiz?id=${videoId.value}` })
}
</script>

<style scoped lang="scss">
.page {
  padding-bottom: 48rpx;
}

.page :deep(.u-card .u-text) {
  width: 100%;
}

.video-section {
  background: #000;
}

.video {
  width: 100%;
  height: 420rpx;
  background: #000;
  display: block;
}

.fox-progress {
  padding: 16rpx 24rpx 20rpx;
  background: #1a1a1a;
}

.fox-progress__track {
  position: relative;
  height: 12rpx;
  border-radius: 6rpx;
  background: rgba(255, 255, 255, 0.25);
}

.fox-progress__fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: 6rpx;
  background: linear-gradient(90deg, #ff8c42, #ff7000);
  pointer-events: none;
}

.fox-progress__thumb {
  position: absolute;
  top: 50%;
  width: 44rpx;
  height: 44rpx;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.nav-row {
  display: flex;
  gap: 24rpx;
  padding: 8rpx 32rpx 20rpx;
}

.nav-btn-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  min-width: 0;
}

.nav-btn-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}

/* 小程序端勿对 u-button 传对象 custom-style，会触发 uview addStyle 对非字符串 .split 报错 */
.page :deep(.nav-lesson-btn.u-button) {
  width: 100% !important;
  min-height: 88rpx !important;
  border-radius: 24rpx !important;
  background-color: #fff7f0 !important;
  border: 2rpx solid #ffd4b8 !important;
  color: #ff7000 !important;
  font-size: 28rpx !important;
  font-weight: 500 !important;
  box-shadow: 0 4rpx 14rpx rgba(255, 112, 0, 0.1);
}

.nav-btn-label {
  font-size: 28rpx;
  color: #ff7000;
  line-height: 1.2;
}

.page :deep(.nav-lesson-btn.u-button--disabled .nav-btn-label) {
  color: #c0c4cc;
}

.nav-hint {
  font-size: 22rpx;
  color: #909399;
}

.bottom-cards {
  padding: 0 32rpx 16rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.info-card {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.info-card__title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12rpx;
}

.info-card__body {
  font-size: 26rpx;
  color: #606266;
  line-height: 1.5;
}

.info-card__body.muted {
  color: #909399;
}

.quiz-row {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #ebeef5;
}

.quiz-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.quiz-row__title {
  display: block;
  font-size: 26rpx;
  color: #303133;
  margin-bottom: 6rpx;
}

.quiz-row__meta {
  font-size: 24rpx;
  color: #909399;
}

.quiz-records-more {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #ff7000;
}

.stats-card {
  cursor: pointer;
}

.stats-card__link {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #ff7000;
}

.actions {
  padding: 32rpx;
}

.quiz-btn-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  width: 100%;
}

.quiz-btn-text {
  font-size: 32rpx;
  line-height: 1.2;
  color: #ffffff;
}

.quiz-icon-order {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5rpx;
  width: 28rpx;
  flex-shrink: 0;
}

.quiz-icon-order-line {
  height: 3rpx;
  background: #ffffff;
  border-radius: 2rpx;
  width: 100%;
}

.quiz-icon-arrow-r {
  width: 16rpx;
  height: 16rpx;
  border-right: 3px solid #ffffff;
  border-top: 3px solid #ffffff;
  transform: rotate(45deg);
  flex-shrink: 0;
}
</style>

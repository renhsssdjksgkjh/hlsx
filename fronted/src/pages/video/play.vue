<template>
  <view class="page">
    <u-card v-if="detail" :show-head="false" :show-foot="false" margin="12px 15px" :border-radius="12">
      <template #body>
        <u-text :text="detail.title" size="16" bold color="#303133" :lines="3" />
      </template>
    </u-card>
    <video v-if="videoSrc" id="courseVideo" :key="videoId" class="video" :src="videoSrc" :enable-progress-gesture="true"
      controls preload="none" show-center-play-btn @timeupdate="onTimeUpdate" @loadedmetadata="onVideoReady" />
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
import { ref } from 'vue'
import { onLoad, onUnload, onHide } from '@dcloudio/uni-app'
import * as videoApi from '@/api/video'

const videoId = ref(0)
const detail = ref<videoApi.VideoItem | null>(null)
const videoSrc = ref('')
const startSec = ref(0)
const lastSec = ref(0)
let lastReport = 0
let ctx: UniApp.VideoContext | null = null

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
    videoApi.saveProgress(videoId.value, lastSec.value).catch(() => { })
  }
})

async function load() {
  videoSrc.value = ''
  try {
    const d = await videoApi.getVideo(videoId.value)
    detail.value = d
    const url = (d.url || '').trim()
    if (!url) {
      detail.value = null
      return
    }
    videoSrc.value = url
    const prog = await videoApi.getProgress(videoId.value)
    startSec.value = prog.position_sec || 0
  } catch {
    detail.value = null
    videoSrc.value = ''
  }
}

function onVideoReady() {
  ctx = uni.createVideoContext('courseVideo')
  if (startSec.value > 0 && ctx) {
    ctx.seek(startSec.value)
  }
}

function onTimeUpdate(e: Event) {
  const payload = (e as unknown as { detail?: { currentTime?: number } }).detail
  const sec = Math.floor(payload?.currentTime ?? 0)
  lastSec.value = sec
  const now = Date.now()
  if (now - lastReport < 4000) return
  lastReport = now
  videoApi.saveProgress(videoId.value, sec).catch(() => { })
}

const END_TOL_SEC = 3
const NO_DURATION_MIN_SEC = 30

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

.video {
  width: 100%;
  height: 420rpx;
  background: #000;
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

/* 白色装饰，不依赖 iconfont（真机兼容） */
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

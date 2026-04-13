<template>
  <view class="page">
    <view v-if="loading" class="loading-wrap">
      <u-loading-icon mode="circle" size="28" color="#ff7000" />
      <u-gap height="12" />
      <u-text text="加载学习进度..." type="tips" size="14" align="center" />
    </view>
    <view v-else class="page-center">
      <view class="progress-panel">
        <u-text text="各课学习进度(%)" size="15" bold color="#303133" align="center" />
        <u-gap height="16" />
        <view v-if="hasData" class="native-bars">
          <view
            v-for="(name, i) in names"
            :key="videoIds[i] ?? i"
            class="bar-row"
            :class="{ 'bar-row--selected': selectedRowIndex === i }"
            hover-class="bar-row--hover"
            @click="onRowTap(i, videoIds[i])"
          >
            <text class="bar-y-label">{{ name }}</text>
            <view class="bar-track">
              <view class="bar-fill" :style="{ width: barWidthStyle(i) }" />
            </view>
            <text class="bar-pct">{{ pctText(i) }}</text>
          </view>
        </view>
        <u-empty v-if="!hasData" mode="data" text="暂无课程数据" margin-top="20" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import * as videoApi from '@/api/video'

const MAX_VIDEOS = 15

/** 课程 1～15 视频总时长(秒)，与后台列表 sort_order 一致；库表无 duration_sec 时用此计算进度 */
const VIDEO_DURATIONS_SEC: readonly number[] = [
  69, 76, 63, 105, 51, 83, 140, 71, 96, 89, 102, 54, 147, 83, 126,
]

const userStore = useUserStore()
const loading = ref(true)
const names = ref<string[]>([])
const percents = ref<number[]>([])
/** 与 names 下标一一对应，用于跳转播放页 */
const videoIds = ref<number[]>([])
/** 当前选中行（点击后高亮，列表刷新时清空） */
const selectedRowIndex = ref(-1)

const hasData = computed(() => names.value.length > 0)

function goPlay(videoId: number | undefined) {
  if (videoId == null || !videoId) return
  uni.navigateTo({ url: `/pages/video/play?id=${videoId}` })
}

function onRowTap(index: number, videoId: number | undefined) {
  selectedRowIndex.value = index
  goPlay(videoId)
}

function percentOf(position: number, duration: number): number {
  if (!duration || duration <= 0) return 0
  const p = (position / duration) * 100
  return Math.min(100, Math.max(0, Math.round(p * 10) / 10))
}

function durationForVideo(index: number, sortOrder: number | undefined, apiSec: number | null | undefined): number {
  const fromApi = Number(apiSec)
  if (fromApi > 0) return fromApi
  const bySort = sortOrder != null && sortOrder >= 1 && sortOrder <= MAX_VIDEOS ? VIDEO_DURATIONS_SEC[sortOrder - 1] : undefined
  if (bySort != null && bySort > 0) return bySort
  return VIDEO_DURATIONS_SEC[index] ?? 0
}

async function load() {
  names.value = []
  percents.value = []
  videoIds.value = []
  selectedRowIndex.value = -1
  try {
    const videos = await videoApi.getVideos()
    const slice = videos.slice(0, MAX_VIDEOS)
    const rows = await Promise.all(
      slice.map(async (v, index) => {
        const prog = await videoApi.getProgress(v.id)
        const pos = prog.position_sec || 0
        const dur = durationForVideo(index, v.sort_order, v.duration_sec)
        return {
          videoId: v.id,
          title: (v.title || `课程 ${v.sort_order}`).trim(),
          p: percentOf(pos, dur),
        }
      }),
    )
    names.value = rows.map((r) => r.title)
    percents.value = rows.map((r) => r.p)
    videoIds.value = rows.map((r) => r.videoId)
  } catch {
    names.value = []
    percents.value = []
    videoIds.value = []
  }
}

async function bootstrapProgress() {
  if (!userStore.token && !uni.getStorageSync('token')) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  if (!userStore.user) {
    await userStore.loadProfile()
  }
  loading.value = true
  await load()
  loading.value = false
}

onShow(() => {
  void bootstrapProgress()
})

function barWidthStyle(i: number): string {
  const p = percents.value[i] ?? 0
  return `${Math.min(100, Math.max(0, p))}%`
}

function pctText(i: number): string {
  return `${Number(percents.value[i] ?? 0).toFixed(1)}%`
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding-bottom: env(safe-area-inset-bottom);
  background: #f6f7f8;
}
.page-center {
  min-height: calc(100vh - env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  box-sizing: border-box;
}
.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  min-height: 50vh;
}
.progress-panel {
  margin: 24rpx;
  padding: 24rpx;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
  width: calc(100% - 48rpx);
  max-width: 100%;
}

.native-bars {
  width: 100%;
}
.bar-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 12rpx;
  padding: 14rpx 16rpx;
  border-radius: 12rpx;
  box-sizing: border-box;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}
.bar-row:last-child {
  margin-bottom: 0;
}
.bar-row--hover {
  opacity: 0.92;
}
.bar-row--selected {
  background: linear-gradient(100deg, rgba(135, 206, 235, 0.28) 0%, rgba(232, 248, 255, 0.92) 55%, rgba(255, 255, 255, 0.4) 100%);
  box-shadow: inset 0 0 0 1rpx rgba(100, 180, 210, 0.35);
}
.bar-y-label {
  width: 168rpx;
  font-size: 22rpx;
  color: #606266;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bar-track {
  flex: 1;
  min-width: 0;
  height: 28rpx;
  background: #eef0f3;
  border-radius: 8rpx;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: #87ceeb;
  border-radius: 8rpx;
}
.bar-pct {
  width: 112rpx;
  margin-left: 12rpx;
  font-size: 22rpx;
  color: #606266;
  text-align: right;
  flex-shrink: 0;
}
</style>

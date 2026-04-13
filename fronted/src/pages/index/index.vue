<template>
  <view class="page">
    <view v-if="loading" class="loading-wrap">
      <u-loading-icon mode="circle" size="28" color="#ff7000" />
      <u-gap height="12" />
      <u-text text="加载中…" type="tips" size="14" align="center" />
    </view>
    <view v-else-if="!list.length" class="empty-state">
      <u-empty mode="data" text="暂无课程" margin-top="0" />
    </view>
    <scroll-view
      v-else
      scroll-y
      class="list"
      :show-scrollbar="false"
      :scroll-top="listScrollTop"
      :scroll-with-animation="false"
      @scroll="onListScroll"
    >
      <u-gap height="8" />
      <view
        v-for="(item, idx) in list"
        :key="item.id"
        class="card-shelf"
        :class="{ 'card-shelf--pulse': pulsingId === item.id }"
      >
        <u-card
          :show-head="false"
          :show-foot="false"
          margin="0"
          :border-radius="12"
          :box-shadow="'0 4rpx 20rpx rgba(0,0,0,0.06)'"
          @body-click="onCardBodyClick(item)"
        >
          <template #body>
            <view class="course-card-body">
              <view class="course-cover-wrap">
                <image class="course-cover" :src="courseCoverSrc(item, idx)" mode="aspectFill" />
              </view>
              <u-cell :label="`课程 ${item.sort_order}`" :is-link="true" arrow-direction="right">
                <template #title>
                  <u-text :text="item.title" :lines="2" size="15" bold color="#303133" />
                </template>
                <template #right-icon>
                  <view class="cell-arrow-r" />
                </template>
              </u-cell>
            </view>
          </template>
        </u-card>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount, nextTick } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import * as videoApi from '@/api/video'

const userStore = useUserStore()
const list = ref<videoApi.VideoItem[]>([])
const loading = ref(true)
/** 正在播放点击缩放动画时记录 id，防止连点 */
const pulsingId = ref<number | null>(null)
let pulseTimer: ReturnType<typeof setTimeout> | null = null

/** 与下方 @keyframes card-pulse 时长一致（ms） */
const PULSE_MS = 520

const LIST_SCROLL_KEY = 'index_course_list_scroll_top'

/** 与 scroll-view :scroll-top 同步，从播放页返回时恢复列表位置 */
const listScrollTop = ref(0)
/** 当前滚动距离，onHide 写入缓存 */
const savedListScrollTop = ref(0)

function onListScroll(e: { detail: { scrollTop: number } }) {
  savedListScrollTop.value = e.detail.scrollTop
}

onHide(() => {
  uni.setStorageSync(LIST_SCROLL_KEY, savedListScrollTop.value)
})

onShow(async () => {
  if (!userStore.token && !uni.getStorageSync('token')) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  if (!userStore.user) {
    await userStore.loadProfile()
  }
  const restoreY = Number(uni.getStorageSync(LIST_SCROLL_KEY) || 0) || 0
  const hadList = list.value.length > 0
  if (!hadList) loading.value = true
  try {
    list.value = await videoApi.getVideos()
  } catch {
    if (!hadList) list.value = []
  } finally {
    loading.value = false
  }
  if (restoreY > 0 && list.value.length) {
    listScrollTop.value = 0
    await nextTick()
    listScrollTop.value = restoreY + 0.01
    await nextTick()
    listScrollTop.value = restoreY
    savedListScrollTop.value = restoreY
  }
})

function openVideo(id: number) {
  uni.navigateTo({ url: `/pages/video/play?id=${id}` })
}

/** 与列表顺序对应的 15 张配图（static/course/course-01.png …） */
const COURSE_COVER_COUNT = 15

function courseCoverSrc(item: videoApi.VideoItem, listIndex: number): string {
  const so = item.sort_order
  const n =
    so >= 1 && so <= COURSE_COVER_COUNT
      ? so
      : Math.min(listIndex + 1, COURSE_COVER_COUNT)
  const file = `course-${String(n).padStart(2, '0')}.png`
  // H5 配置了 base（如 /hry/），必须用 BASE_URL 拼接，否则请求到 /static/... 而非 /hry/static/...
  // #ifdef H5
  const raw = import.meta.env.BASE_URL || '/'
  const base = raw.endsWith('/') ? raw : `${raw}/`
  return `${base}static/course/${file}`
  // #endif
  // #ifndef H5
  return `/static/course/${file}`
  // #endif
}

function onCardBodyClick(item: videoApi.VideoItem) {
  if (pulsingId.value !== null) return
  pulsingId.value = item.id
  if (pulseTimer) clearTimeout(pulseTimer)
  pulseTimer = setTimeout(() => {
    pulseTimer = null
    const id = item.id
    pulsingId.value = null
    openVideo(id)
  }, PULSE_MS)
}

onBeforeUnmount(() => {
  if (pulseTimer) {
    clearTimeout(pulseTimer)
    pulseTimer = null
  }
})
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding-bottom: env(safe-area-inset-bottom);
}

.list {
  flex: 1;
  height: 0;
  min-height: 200px;
  padding: 0 15px 24rpx;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* 单列「瀑布」卡片流：每行一张，竖向排列 */
.course-card-body {
  overflow: hidden;
}

.course-cover-wrap {
  width: 100%;
  height: 360rpx;
  background: #f0f1f3;
}

.course-cover {
  width: 100%;
  height: 100%;
  display: block;
}

/* 课程卡片：仅点击后放大；左右留白与 overflow-x 防止放大后贴边溢出 */
.card-shelf {
  margin: 0 0 20rpx;
  padding: 0;
  box-sizing: border-box;
}

.card-shelf:last-child {
  margin-bottom: 0;
}

/* flex 子项内省略号需缩小最小宽度 */
.card-shelf :deep(.u-cell__title) {
  min-width: 0;
}

.card-shelf :deep(.u-cell__label) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.card-shelf :deep(.u-card) {
  transform-origin: center center;
}

@keyframes card-pulse {
  0% {
    transform: scale(1);
  }

  40% {
    transform: scale(1.08);
  }

  100% {
    transform: scale(1);
  }
}

.card-shelf--pulse :deep(.u-card) {
  animation: card-pulse 0.52s ease-in-out forwards;
  position: relative;
  z-index: 2;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  width: 100%;
}

.loading-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  min-height: 50vh;
}

/* 右箭头：边框旋转，不依赖 uview 字体 */
.cell-arrow-r {
  width: 14rpx;
  height: 14rpx;
  border-right: 3px solid #c8c9cc;
  border-top: 3px solid #c8c9cc;
  transform: rotate(45deg);
  flex-shrink: 0;
  margin-left: 4rpx;
}
</style>

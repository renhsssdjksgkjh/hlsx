<template>
  <view class="index-page">
    <view class="page">
      <view v-if="loading && !sourceList.length" class="loading-wrap">
        <u-loading-icon mode="circle" size="28" color="#ff7000" />
        <u-gap height="12" />
        <u-text text="加载中…" type="tips" size="14" align="center" />
      </view>
      <template v-else>
        <view class="search-strip" @tap.stop>
          <view class="search-bar">
            <u-icon name="search" :size="19" color="#ff7000" />
            <input
              v-model="searchInput"
              class="search-bar__input"
              type="text"
              confirm-type="search"
              placeholder="搜索课程名称"
              placeholder-class="search-bar__placeholder"
              :adjust-position="true"
              :hold-keyboard="true"
              cursor-color="#ff7000"
              @confirm="applySearch"
            />
            <view
              v-if="searchInput.length > 0"
              class="search-bar__clear"
              @tap.stop="onSearchClear"
            >
              <text class="search-bar__clear-x">×</text>
            </view>
            <text class="search-bar__action" @tap.stop="applySearch">搜索</text>
          </view>
        </view>
        <view v-if="!sourceList.length" class="empty-state">
          <u-empty mode="data" text="暂无课程" margin-top="0" />
        </view>
        <view v-else-if="!filteredList.length" class="empty-state">
          <u-empty mode="search" text="未找到相关课程" margin-top="0" />
        </view>
        <view v-else class="list">
          <u-gap height="8" />
          <view
            v-for="(item, idx) in filteredList"
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
        </view>
      </template>
    </view>

    <back-top-fab :show="fabBackTopVisible" @back="onBackTop" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
// @ts-expect-error uni-app 运行时提供，部分 @dcloudio/types 未导出 onPageScroll
import { onShow, onPageScroll } from '@dcloudio/uni-app'
import { useScrollBackTop } from '@/composables/useScrollBackTop'
import { useUserStore } from '@/stores/user'
import * as videoApi from '@/api/video'

const userStore = useUserStore()

const { showBackTop, onBackTop, resetListScrollState, handlePageScroll } = useScrollBackTop({
  listScrollStorageKey: 'index_course_list_scroll_top',
})

onPageScroll(handlePageScroll)

const sourceList = ref<videoApi.VideoItem[]>([])
const searchInput = ref('')
const appliedQuery = ref('')
const loading = ref(true)

const filteredList = computed(() => {
  const q = appliedQuery.value.trim()
  if (!q) return sourceList.value
  const low = q.toLowerCase()
  return sourceList.value.filter((v) => v.title.toLowerCase().includes(low))
})

/** 有课程列表且可滚动区域存在时，才允许显示回顶按钮 */
const hasScrollableCourseList = computed(
  () => sourceList.value.length > 0 && filteredList.value.length > 0
)

/** 回顶按钮：独立于 loading，挂在 page 根上，避免触摸被遮挡 */
const fabBackTopVisible = computed(
  () =>
    !loading.value &&
    hasScrollableCourseList.value &&
    showBackTop.value
)
/** 正在播放点击缩放动画时记录 id，防止连点 */
const pulsingId = ref<number | null>(null)
let pulseTimer: ReturnType<typeof setTimeout> | null = null

/** 与下方 @keyframes card-pulse 时长一致（ms） */
const PULSE_MS = 520

onShow(async () => {
  if (!userStore.token && !uni.getStorageSync('token')) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  if (!userStore.user) {
    await userStore.loadProfile()
  }
  const hadList = sourceList.value.length > 0
  // 已有课程数据时不再每次 onShow 请求接口，避免异步完成后整页重绘导致搜索框失焦
  if (!hadList) {
    loading.value = true
    try {
      sourceList.value = await videoApi.getVideos()
    } catch {
      sourceList.value = []
    } finally {
      loading.value = false
    }
  } else {
    loading.value = false
  }
})

function applySearch() {
  appliedQuery.value = searchInput.value.trim()
  resetListScrollState()
}

function onSearchClear() {
  searchInput.value = ''
  appliedQuery.value = ''
  resetListScrollState()
}

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
.index-page {
  min-height: 100vh;
  width: 100%;
  position: relative;
  box-sizing: border-box;
}

.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding-bottom: calc(env(safe-area-inset-bottom) + 1px);
  position: relative;
  z-index: 0;
}

/* 页面滚动时搜索条吸顶；勿给 .page 设 overflow:hidden，否则影响整页滚动与 sticky */
.search-strip {
  position: sticky;
  top: 0;
  z-index: 20;
  padding: 20rpx 15px 12rpx;
  background: linear-gradient(180deg, #fff5eb 0%, #f6f7f8 100%);
  box-sizing: border-box;
}

.search-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0 20rpx 0 24rpx;
  min-height: 72rpx;
  border-radius: 100px;
  background: #ffffff;
  box-shadow: 0 4rpx 24rpx rgba(255, 112, 0, 0.08);
  border: 1px solid rgba(255, 112, 0, 0.12);
  box-sizing: border-box;
}

.search-bar__input {
  flex: 1;
  min-width: 0;
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 12rpx;
  font-size: 30rpx;
  color: #303133;
  background: transparent;
}

.search-bar__placeholder {
  color: #909399;
  font-size: 30rpx;
}

.search-bar__clear {
  flex-shrink: 0;
  width: 44rpx;
  height: 44rpx;
  margin-right: 8rpx;
  border-radius: 50%;
  background: #c6c7cb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-bar__clear-x {
  color: #ffffff;
  font-size: 32rpx;
  line-height: 1;
  font-weight: 600;
}

.search-bar__action {
  flex-shrink: 0;
  padding: 12rpx 0 12rpx 16rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #ff7000;
}

.list {
  position: relative;
  z-index: 1;
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
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
  width: 100%;
}

.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  min-height: 70vh;
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

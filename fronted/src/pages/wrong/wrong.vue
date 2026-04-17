<template>
  <view class="wrong-page">
    <view class="page">
      <view v-if="loading" class="loading-wrap">
        <u-loading-icon mode="circle" size="28" color="#ff7000" />
        <u-gap height="12" />
        <u-text text="加载错题…" type="tips" size="14" align="center" />
      </view>
      <view v-else-if="!list.length" class="empty-state">
        <u-empty mode="data" text="暂无错题" margin-top="0" />
      </view>
      <scroll-view
        v-else
        :key="'wrong-list-' + scrollViewKey"
        scroll-y
        class="list"
        :show-scrollbar="false"
        :refresher-enabled="true"
        :refresher-triggered="refreshing"
        @refresherrefresh="onRefresh"
        @scroll="onListScroll"
      >
        <u-gap height="8" />
        <view
          v-for="item in list"
          :key="item.question_id"
          class="wrong-card-touch"
          @touchstart="onCardTouchStart(item)"
          @touchend="onCardTouchEnd"
          @touchcancel="onCardTouchEnd"
        >
          <u-card
            :show-head="false"
            :show-foot="false"
            margin="12px 15px"
            :border-radius="12"
            :box-shadow="'0 4rpx 20rpx rgba(0,0,0,0.06)'"
            @body-click="openDetail(item.question_id)"
          >
            <template #body>
              <u-text :text="item.video_title" type="tips" size="12" color="#909399" />
              <u-gap height="8" />
              <u-tag :text="typeLabel(item.type)" type="warning" plain size="mini" />
              <u-gap height="10" />
              <u-text :text="item.content" size="15" color="#303133" :lines="0" />
            </template>
          </u-card>
        </view>
        <u-gap height="24" />
      </scroll-view>
    </view>

    <back-top-fab :show="fabBackTopVisible" @back="onBackTop" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
// @ts-expect-error uni-app 运行时提供，部分 @dcloudio/types 未导出 onPageScroll
import { onShow, onPageScroll } from '@dcloudio/uni-app'
import { useScrollBackTop } from '@/composables/useScrollBackTop'
import { useUserStore } from '@/stores/user'
import * as quizApi from '@/api/quiz'

const userStore = useUserStore()

const { showBackTop, scrollViewKey, onListScroll, onBackTop, handlePageScroll } = useScrollBackTop()

onPageScroll(handlePageScroll)

const LONG_PRESS_MS = 500

const list = ref<quizApi.WrongQuestionItem[]>([])
const loading = ref(true)
const refreshing = ref(false)
const suppressNextNav = ref(false)
let longPressTimer: ReturnType<typeof setTimeout> | null = null

const fabBackTopVisible = computed(
  () => !loading.value && list.value.length > 0 && showBackTop.value
)

function norm(t: string) {
  return (t || '').trim()
}
function typeLabel(t: string) {
  const s = norm(t).toLowerCase()
  if (s === 'single' || s === 'single_choice') return '单选题'
  if (s === 'multi' || s === 'multiple' || s === 'multiple_choice') return '多选题'
  if (s === 'judge' || s === 'judgment' || s === 'true_false') return '判断题'
  if (norm(t) === '单选题' || norm(t) === '单选') return '单选题'
  if (norm(t) === '多选题' || norm(t) === '多选') return '多选题'
  if (norm(t) === '判断题' || norm(t) === '判断') return '判断题'
  return t
}

async function load() {
  try {
    list.value = await quizApi.getWrongQuestions()
  } catch {
    list.value = []
  }
}

async function onRefresh() {
  refreshing.value = true
  await load()
  refreshing.value = false
}

function clearLongPressTimer() {
  if (longPressTimer != null) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function onCardTouchStart(item: quizApi.WrongQuestionItem) {
  clearLongPressTimer()
  longPressTimer = setTimeout(() => {
    longPressTimer = null
    suppressNextNav.value = true
    uni.showModal({
      title: '提示',
      content: '您确定要删除这个错题吗？',
      confirmText: '确认',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          void confirmRemoveWrong(item)
        } else {
          suppressNextNav.value = false
        }
      },
    })
  }, LONG_PRESS_MS)
}

function onCardTouchEnd() {
  clearLongPressTimer()
}

async function confirmRemoveWrong(item: quizApi.WrongQuestionItem) {
  try {
    await quizApi.removeWrongQuestion(item.question_id)
    list.value = list.value.filter((x) => x.question_id !== item.question_id)
    uni.showToast({ title: '已删除', icon: 'success' })
  } catch {
    // request 已提示
  } finally {
    suppressNextNav.value = false
  }
}

function openDetail(questionId: number) {
  if (suppressNextNav.value) {
    suppressNextNav.value = false
    return
  }
  if (!questionId) return
  uni.navigateTo({ url: `/pages/wrong/detail?id=${questionId}` })
}

onShow(async () => {
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
})
</script>

<style scoped lang="scss">
.wrong-page {
  min-height: 100vh;
  width: 100%;
  position: relative;
  box-sizing: border-box;
}

.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding-bottom: env(safe-area-inset-bottom);
  position: relative;
  z-index: 0;
}
.list {
  flex: 1;
  height: 0;
  min-height: 200px;
  box-sizing: border-box;
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
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  width: 100%;
}

.wrong-card-touch {
  width: 100%;
  box-sizing: border-box;
}
</style>

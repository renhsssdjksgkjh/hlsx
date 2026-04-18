<template>
  <view class="page">
    <view v-if="loading" class="loading-wrap">
      <u-loading-icon mode="circle" size="28" color="#ff7000" />
      <u-gap height="12" />
      <u-text text="加载中…" type="tips" size="14" align="center" />
    </view>
    <u-empty v-else-if="!list.length" mode="data" text="暂无测验记录" margin-top="80" />
    <scroll-view v-else scroll-y class="scroll">
      <view class="info-card">
        <view
          v-for="row in list"
          :key="row.id"
          class="quiz-row"
          @click="openQuiz(row.video_id)"
        >
          <text class="quiz-row__title">{{ row.video_title }}</text>
          <text class="quiz-row__meta">{{ row.score }}/{{ row.total }} · {{ formatTime(row.created_at) }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { fetchQuizRecords, type QuizRecordRow } from '@/api/user'

const loading = ref(true)
const list = ref<QuizRecordRow[]>([])

onLoad(() => {
  if (!uni.getStorageSync('token')) {
    uni.reLaunch({ url: '/pages/login/login' })
  }
})

onShow(() => {
  if (!uni.getStorageSync('token')) return
  void load()
})

async function load() {
  loading.value = true
  try {
    const res = await fetchQuizRecords(50)
    list.value = res.list || []
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function formatTime(iso: string) {
  if (!iso) return ''
  return String(iso).slice(0, 10)
}

function openQuiz(vid: number) {
  uni.navigateTo({ url: `/pages/quiz/quiz?id=${vid}` })
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f6f7f8;
}
.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}
.scroll {
  max-height: calc(100vh - 40rpx);
  padding: 24rpx 32rpx 48rpx;
  box-sizing: border-box;
}
.info-card {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 8rpx 24rpx 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}
.quiz-row {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #ebeef5;
}
.quiz-row:last-child {
  border-bottom: none;
  padding-bottom: 8rpx;
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
</style>

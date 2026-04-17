<template>
  <view class="page">
    <view v-if="loading && !list.length" class="loading-wrap">
      <u-loading-icon mode="circle" size="28" color="#ff7000" />
      <u-gap height="12" />
      <u-text text="加载中…" type="tips" size="14" align="center" />
    </view>
    <view v-else-if="!list.length" class="empty-wrap">
      <u-empty mode="data" text="暂无群公告" margin-top="0" />
    </view>
    <view v-else class="list">
      <u-card v-for="item in list" :key="item.id" :show-head="false" :show-foot="false" margin="12px 15px"
        :border-radius="12" :box-shadow="'0 4rpx 20rpx rgba(0,0,0,0.06)'" @body-click="openDetail(item.id)">
        <template #body>
          <u-text :text="item.title" size="16" bold color="#303133" :lines="2" />
          <u-gap height="10" />
          <u-text :text="formatTime(item.created_at)" type="tips" size="12" color="#909399" />
        </template>
      </u-card>
      <u-gap height="24" />
    </view>

    <u-popup v-model:show="popupShow" mode="center" :round="12">
      <view class="popup-box">
        <view class="popup-title">{{ detail?.title }}</view>
        <scroll-view scroll-y class="popup-scroll">
          <text class="popup-body">{{ detail?.body }}</text>
        </scroll-view>
        <view class="popup-close-wrap">
          <view class="popup-close-btn" hover-class="popup-close-btn--hover" @tap.stop="closePopup"
            @click.stop="closePopup">
            <text class="popup-close-icon">✕</text>
          </view>
        </view>
      </view>
    </u-popup>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { fetchNoticeList, fetchNoticeDetail, type NoticeListItem, type NoticeDetail } from '@/api/notice'

const userStore = useUserStore()
const loading = ref(true)
const list = ref<NoticeListItem[]>([])
const popupShow = ref(false)
const detail = ref<NoticeDetail | null>(null)

function formatTime(raw: string) {
  const d = new Date(String(raw).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return raw
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

async function load() {
  loading.value = true
  try {
    const data = await fetchNoticeList()
    list.value = data.list || []
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

async function openDetail(id: number) {
  try {
    const d = await fetchNoticeDetail(id)
    detail.value = d
    popupShow.value = true
  } catch {
    detail.value = null
  }
}

function closePopup() {
  popupShow.value = false
}

onShow(async () => {
  if (!userStore.token && !uni.getStorageSync('token')) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  if (!userStore.user) {
    await userStore.loadProfile()
  }
  await load()
})
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding-bottom: env(safe-area-inset-bottom);
  background: #f6f7f8;
}

.loading-wrap,
.empty-wrap {
  padding: 120rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.list {
  padding-top: 8rpx;
}

.popup-box {
  width: 640rpx;
  max-width: 92vw;
  padding: 32rpx 28rpx 24rpx;
  box-sizing: border-box;
}

.popup-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #303133;
  margin-bottom: 20rpx;
  line-height: 1.4;
}

.popup-scroll {
  max-height: 50vh;
  margin-bottom: 16rpx;
}

.popup-body {
  font-size: 28rpx;
  color: #606266;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.popup-close-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 8rpx;
}

.popup-close-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.popup-close-btn--hover {
  opacity: 0.75;
}

.popup-close-icon {
  align-items: center;
  font-size: 32rpx;
  line-height: 1;
  color: #909399;
}
</style>

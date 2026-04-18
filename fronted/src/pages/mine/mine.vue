<template>
  <view class="page">
    <view v-if="userStore.user" class="profile-hero">
      <view class="profile-hero__avatar-shell" @tap.stop="onAvatarTap">
        <image
          class="profile-hero__avatar-img"
          :src="userAvatarDisplaySrc(userStore.user)"
          mode="aspectFill"
        />
      </view>
      <view class="profile-hero__info">
        <text v-if="userStore.user.phone" class="profile-hero__line1">电话：{{ userStore.user.phone }}</text>
        <text v-if="userStore.user.nickname" class="profile-hero__line2">姓名：{{ userStore.user.nickname }}</text>
        <text v-if="userStore.user.signature" class="profile-hero__line3">签名：{{ userStore.user.signature }}</text>
      </view>
    </view>
    <u-card
      :show-head="false"
      :show-foot="false"
      margin="12px 15px"
      :border-radius="12"
      :box-shadow="'0 4rpx 20rpx rgba(0,0,0,0.06)'"
    >
      <template #body>
        <u-cell
          title="个人资料"
          :is-link="true"
          arrow-direction="right"
          :border="true"
          @click="goProfile"
        />
        <u-cell
          title="修改密码"
          :is-link="true"
          arrow-direction="right"
          :border="true"
          @click="goChangePassword"
        />
        <u-cell
          title="群公告"
          :is-link="true"
          arrow-direction="right"
          :border="true"
          @click="goNoticeList"
        />
        <u-cell
          title="全部测验"
          :is-link="true"
          arrow-direction="right"
          :border="false"
          @click="goQuizHistory"
        />
      </template>
    </u-card>

    <u-card
      v-if="statsLoadError"
      :show-head="false"
      :show-foot="false"
      margin="12px 15px"
      :border-radius="12"
      :box-shadow="'0 4rpx 20rpx rgba(0,0,0,0.06)'"
    >
      <template #body>
        <u-text text="学习概览加载失败" size="14" color="#909399" align="center" />
      </template>
    </u-card>

    <u-card
      v-else-if="mineStats"
      :show-head="false"
      :show-foot="false"
      margin="12px 15px"
      :border-radius="12"
      :box-shadow="'0 4rpx 20rpx rgba(0,0,0,0.06)'"
    >
      <template #body>
        <u-text text="学习概览" size="16" bold color="#303133" />
        <u-gap height="16" />
        <view class="stats-grid">
          <view class="stats-cell">
            <text class="stats-cell__num">{{ mineStats.course_completed }}/{{ mineStats.course_total }}</text>
            <text class="stats-cell__label">已学完/课程</text>
          </view>
          <view class="stats-cell">
            <text class="stats-cell__num">{{ mineStats.quiz_attempts }}</text>
            <text class="stats-cell__label">测验次数</text>
          </view>
          <view class="stats-cell">
            <text class="stats-cell__num">{{ mineStats.wrong_count }}</text>
            <text class="stats-cell__label">错题数</text>
          </view>
        </view>
        <u-gap height="16" />
        <view class="stats-last">
          <text v-if="mineStats.last_quiz" class="stats-last__text">
            最近测验：{{ mineStats.last_quiz.video_title }} · {{ mineStats.last_quiz.score }}/{{
              mineStats.last_quiz.total
            }}
            · {{ formatQuizTime(mineStats.last_quiz.created_at) }}
          </text>
          <text v-else class="stats-last__text stats-last__text--muted">暂无测验记录</text>
        </view>
        <u-gap height="20" />
        <view class="stats-quick">
          <view class="stats-quick__btn" hover-class="stats-quick__btn--hover" @click="goProgressTab">
            <text class="stats-quick__btn-text">学习进度</text>
          </view>
          <view class="stats-quick__btn" hover-class="stats-quick__btn--hover" @click="goWrongTab">
            <text class="stats-quick__btn-text">错题集</text>
          </view>
        </view>
      </template>
    </u-card>

    <view class="logout-wrap">
      <u-button
        text="退出登录"
        type="error"
        plain
        size="large"
        :custom-style="{ width: 'calc(100% - 48rpx)', margin: '0 24rpx' }"
        @click="onLogout"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { uploadAvatar, userAvatarDisplaySrc } from '@/api/auth'
import { fetchMineStats, type MineStats } from '@/api/user'
import { compressImageToMaxSize } from '@/utils/compressImage'

const userStore = useUserStore()
const avatarUploading = ref(false)
const mineStats = ref<MineStats | null>(null)
const statsLoadError = ref(false)

onShow(async () => {
  if (!userStore.token) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  statsLoadError.value = false
  await Promise.all([
    userStore.loadProfile(),
    fetchMineStats()
      .then((d) => {
        mineStats.value = d
      })
      .catch(() => {
        mineStats.value = null
        statsLoadError.value = true
      }),
  ])
})

function formatQuizTime(raw: string) {
  const d = new Date(String(raw).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return raw
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

function goProgressTab() {
  uni.switchTab({ url: '/pages/progress/progress' })
}

function goWrongTab() {
  uni.switchTab({ url: '/pages/wrong/wrong' })
}

function onAvatarTap() {
  if (avatarUploading.value) return
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const fp = res.tempFilePaths[0]
      if (!fp) return
      avatarUploading.value = true
      try {
        const toUpload = await compressImageToMaxSize(fp)
        await uploadAvatar(toUpload)
        await userStore.loadProfile()
        uni.showToast({ title: '头像已更新', icon: 'success' })
      } catch {
        // toast 已在 uploadAvatar / loadProfile 中处理
      } finally {
        avatarUploading.value = false
      }
    },
  })
}

function goProfile() {
  uni.navigateTo({ url: '/pages/mine/profile' })
}

function goChangePassword() {
  uni.navigateTo({ url: '/pages/mine/change-password' })
}

function goNoticeList() {
  uni.navigateTo({ url: '/pages/mine/notice-list' })
}

function goQuizHistory() {
  uni.navigateTo({ url: '/pages/quiz/quiz-history' })
}

function onLogout() {
  userStore.logout()
  uni.reLaunch({ url: '/pages/login/login' })
}
</script>

<style scoped lang="scss">
.page {
  padding: 24rpx 0 48rpx;
  min-height: 100vh;
}

.profile-hero {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 0 15px 12px;
  padding: 28rpx 24rpx;
  box-sizing: border-box;
  border-radius: 24rpx;
  background: linear-gradient(90deg, #ffc300 0%, #c7b42c 100%);
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.profile-hero__avatar-shell {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #ffffff;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.profile-hero__avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.profile-hero__info {
  flex: 1;
  min-width: 0;
  margin-left: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.profile-hero__line1 {
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-hero__line2 {
  color: rgba(255, 255, 255, 0.95);
  font-size: 28rpx;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.profile-hero__line3 {
  color: rgba(255, 255, 255, 0.88);
  font-size: 24rpx;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.logout-wrap {
  margin-top: 32rpx;
}

.stats-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16rpx 12rpx;
}

.stats-cell {
  flex: 1;
  min-width: 28%;
  padding: 20rpx 12rpx;
  border-radius: 12rpx;
  background: #fff8f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  box-sizing: border-box;
}

.stats-cell__num {
  font-size: 32rpx;
  font-weight: 700;
  color: #ff7000;
  line-height: 1.2;
  text-align: center;
  word-break: break-all;
}

.stats-cell__label {
  font-size: 22rpx;
  color: #606266;
  text-align: center;
  line-height: 1.3;
}

.stats-last {
  padding: 16rpx 8rpx 0;
}

.stats-last__text {
  font-size: 24rpx;
  color: #606266;
  line-height: 1.5;
  word-break: break-word;
}

.stats-last__text--muted {
  color: #909399;
}

.stats-quick {
  display: flex;
  flex-direction: row;
  gap: 20rpx;
}

.stats-quick__btn {
  flex: 1;
  padding: 20rpx 16rpx;
  border-radius: 12rpx;
  border: 1px solid #ffcc99;
  background: #fffaf5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-quick__btn--hover {
  opacity: 0.88;
}

.stats-quick__btn-text {
  font-size: 28rpx;
  color: #ff7000;
  font-weight: 500;
}
</style>

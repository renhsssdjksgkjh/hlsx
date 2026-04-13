<template>
  <view class="page">
    <u-card
      v-if="userStore.user"
      :show-head="false"
      :show-foot="false"
      margin="12px 15px"
      :border-radius="12"
      :box-shadow="'0 4rpx 20rpx rgba(0,0,0,0.06)'"
    >
      <template #body>
        <u-text :text="userStore.user.phone" size="18" bold color="#303133" :lines="1" />
        <u-gap v-if="userStore.user.nickname" height="12" />
        <u-text v-if="userStore.user.nickname" :text="userStore.user.nickname" type="tips" size="14" :lines="2" />
      </template>
    </u-card>
    <u-card :show-head="false" :show-foot="false" margin="12px 15px" :border-radius="12" :box-shadow="'0 4rpx 20rpx rgba(0,0,0,0.06)'">
      <template #body>
        <u-text text="修改密码" size="16" bold color="#303133" />
        <u-gap height="20" />
        <u-text text="原密码" size="14" color="#555" />
        <u-gap height="8" />
        <u-input
          v-model="oldPwd"
          :password="oldPwdMasked"
          :password-visibility-toggle="false"
          border="surround"
          placeholder="请输入原密码"
          cursor-color="#ff7000"
        >
          <template #suffix>
            <view class="pwd-eye-hit" @tap.stop="oldPwdMasked = !oldPwdMasked">
              <view class="pwd-eye-icon" :class="{ 'pwd-eye-icon--masked': oldPwdMasked }" />
            </view>
          </template>
        </u-input>
        <u-gap height="20" />
        <u-text text="新密码（至少6位）" size="14" color="#555" />
        <u-gap height="8" />
        <u-input
          v-model="newPwd"
          :password="newPwdMasked"
          :password-visibility-toggle="false"
          border="surround"
          placeholder="请输入新密码"
          cursor-color="#ff7000"
        >
          <template #suffix>
            <view class="pwd-eye-hit" @tap.stop="newPwdMasked = !newPwdMasked">
              <view class="pwd-eye-icon" :class="{ 'pwd-eye-icon--masked': newPwdMasked }" />
            </view>
          </template>
        </u-input>
        <u-gap height="20" />
        <u-button
          text="保存新密码"
          type="primary"
          size="large"
          :loading="pwdLoading"
          :custom-style="{ width: '100%' }"
          @click="onChangePwd"
        />
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

    <!-- 改密成功：提示 1 秒后跳转登录 -->
    <view v-if="pwdSuccessOverlay" class="pwd-success-overlay" @touchmove.stop.prevent>
      <view class="pwd-success-box">
        <text class="pwd-success-line">密码保存成功！</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import * as authApi from '@/api/auth'

const userStore = useUserStore()
const oldPwd = ref('')
const newPwd = ref('')
const oldPwdMasked = ref(true)
const newPwdMasked = ref(true)
const pwdLoading = ref(false)
const pwdSuccessOverlay = ref(false)
let pwdSuccessTimer: ReturnType<typeof setTimeout> | null = null

onShow(async () => {
  if (!userStore.token) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  await userStore.loadProfile()
})

async function onChangePwd() {
  if (!oldPwd.value || !newPwd.value) {
    uni.showToast({ title: '请填写完整', icon: 'none' })
    return
  }
  if (newPwd.value.length < 6) {
    uni.showToast({ title: '新密码至少6位', icon: 'none' })
    return
  }
  pwdLoading.value = true
  try {
    await authApi.changePassword(oldPwd.value, newPwd.value)
    oldPwd.value = ''
    newPwd.value = ''
    oldPwdMasked.value = true
    newPwdMasked.value = true
    userStore.logout()
    pwdSuccessOverlay.value = true
    if (pwdSuccessTimer) clearTimeout(pwdSuccessTimer)
    pwdSuccessTimer = setTimeout(() => {
      pwdSuccessTimer = null
      pwdSuccessOverlay.value = false
      pwdLoading.value = false
      uni.reLaunch({ url: '/pages/login/login' })
    }, 1000)
  } catch {
    pwdLoading.value = false
  }
}

onBeforeUnmount(() => {
  if (pwdSuccessTimer) {
    clearTimeout(pwdSuccessTimer)
    pwdSuccessTimer = null
  }
})

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
.page :deep(.u-card .u-text) {
  max-width: 100%;
}

.pwd-eye-hit {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8rpx 4rpx 8rpx 12rpx;
  margin-right: -4rpx;
}
.pwd-eye-icon {
  width: 36rpx;
  height: 24rpx;
  border: 2px solid #909399;
  border-radius: 50%;
  box-sizing: border-box;
  position: relative;
}
.pwd-eye-icon::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 10rpx;
  height: 10rpx;
  background: #909399;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.pwd-eye-icon--masked::before {
  content: '';
  position: absolute;
  left: 2rpx;
  right: 2rpx;
  top: 50%;
  height: 2px;
  background: #909399;
  transform: translateY(-50%) rotate(-32deg);
  z-index: 1;
}

.logout-wrap {
  margin-top: 32rpx;
}

.pwd-success-overlay {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
  box-sizing: border-box;
}

.pwd-success-box {
  background: rgba(48, 48, 48, 0.94);
  padding: 36rpx 56rpx;
  border-radius: 16rpx;
  max-width: 100%;
  box-sizing: border-box;
}

.pwd-success-line {
  display: block;
  color: #ffffff;
  font-size: 30rpx;
  line-height: 1.65;
  text-align: center;
  word-break: break-all;
}
</style>

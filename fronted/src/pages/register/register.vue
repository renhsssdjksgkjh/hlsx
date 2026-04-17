<template>
  <view class="page">
    <view class="brand">
      <u-text text="狐灵商学" size="22" :bold="true" color="#ff7000" align="center" :lines="2" />
      <u-gap height="16" />
      <u-text text="狐灵仙草 · 奶茶制作培训" type="tips" size="13" align="center" :lines="2" />
    </view>
    <u-card :show-head="false" :show-foot="false" margin="24rpx" :border-radius="16" :box-shadow="'0 4rpx 24rpx rgba(0,0,0,0.06)'">
      <template #body>
        <u-text text="昵称" size="14" color="#303133" />
        <u-gap height="8" />
        <u-input
          v-model="nickname"
          type="text"
          :maxlength="32"
          border="surround"
          placeholder="请输入昵称"
          clearable
          cursor-color="#ff7000"
        />
        <u-gap height="24" />
        <u-text text="手机号" size="14" color="#303133" />
        <u-gap height="8" />
        <u-input
          v-model="phone"
          type="number"
          :maxlength="11"
          border="surround"
          placeholder="请输入手机号"
          clearable
          cursor-color="#ff7000"
        />
        <u-gap height="24" />
        <u-text text="密码" size="14" color="#303133" />
        <u-gap height="8" />
        <u-input
          v-model="password"
          :password="pwdMasked"
          :password-visibility-toggle="false"
          border="surround"
          placeholder="请输入密码"
          cursor-color="#ff7000"
        >
          <template #suffix>
            <view class="pwd-eye-hit" @tap.stop="pwdMasked = !pwdMasked">
              <view class="pwd-eye-icon" :class="{ 'pwd-eye-icon--masked': pwdMasked }" />
            </view>
          </template>
        </u-input>
        <u-gap height="24" />
        <u-text text="确认密码" size="14" color="#303133" />
        <u-gap height="8" />
        <u-input
          v-model="passwordConfirm"
          :password="pwdConfirmMasked"
          :password-visibility-toggle="false"
          border="surround"
          placeholder="请再次输入密码"
          cursor-color="#ff7000"
        >
          <template #suffix>
            <view class="pwd-eye-hit" @tap.stop="pwdConfirmMasked = !pwdConfirmMasked">
              <view class="pwd-eye-icon" :class="{ 'pwd-eye-icon--masked': pwdConfirmMasked }" />
            </view>
          </template>
        </u-input>
        <u-gap height="24" />
        <u-button
          text="注册"
          type="primary"
          size="large"
          :loading="loading"
          :custom-style="{ width: '100%' }"
          @click="onSubmit"
        />
      </template>
    </u-card>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import * as authApi from '@/api/auth'

const nickname = ref('')
const phone = ref('')
const password = ref('')
const passwordConfirm = ref('')
const pwdMasked = ref(true)
const pwdConfirmMasked = ref(true)
const loading = ref(false)

async function onSubmit() {
  const nick = nickname.value.trim()
  if (!nick) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }
  if (!/^1\d{10}$/.test(phone.value)) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' })
    return
  }
  if (!password.value) {
    uni.showToast({ title: '请输入密码', icon: 'none' })
    return
  }
  if (!passwordConfirm.value) {
    uni.showToast({ title: '请再次输入密码', icon: 'none' })
    return
  }
  if (password.value !== passwordConfirm.value) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' })
    return
  }
  loading.value = true
  try {
    await authApi.register(phone.value, password.value, nick)
    uni.showToast({ title: '注册成功！', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/login/login' })
    }, 400)
  } catch (e: unknown) {
    const err = e as { message?: string }
    if (err?.message) {
      uni.showToast({ title: err.message, icon: 'none' })
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 80rpx 0 48rpx;
  box-sizing: border-box;
}
.brand {
  padding: 0 32rpx;
  text-align: center;
  margin-bottom: 24rpx;
  width: 100%;
  box-sizing: border-box;
}
.brand :deep(.u-text) {
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
</style>

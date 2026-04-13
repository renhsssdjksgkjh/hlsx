<template>
  <view class="page">
    <view class="brand">
      <u-text text="狐灵商学" size="22" :bold="true" color="#ff7000" align="center" :lines="2" />
      <u-gap height="16" />
      <u-text text="狐灵仙草 · 奶茶制作培训" type="tips" size="13" align="center" :lines="2" />
    </view>
    <u-card :show-head="false" :show-foot="false" margin="24rpx" :border-radius="16" :box-shadow="'0 4rpx 24rpx rgba(0,0,0,0.06)'">
      <template #body>
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
          confirm-type="done"
          @confirm="onSubmit"
        >
          <template #suffix>
            <view class="pwd-eye-hit" @tap.stop="pwdMasked = !pwdMasked">
              <view class="pwd-eye-icon" :class="{ 'pwd-eye-icon--masked': pwdMasked }" />
            </view>
          </template>
        </u-input>
        <u-gap height="24" />
        <u-button
          text="登录"
          type="primary"
          size="large"
          :loading="loading"
          :custom-style="{ width: '100%' }"
          @click="onSubmit"
        />
        <u-gap height="16" />
        <u-button
          text="注册"
          type="primary"
          plain
          size="large"
          :custom-style="{ width: '100%' }"
          @click="goRegister"
        />
      </template>
    </u-card>

    <view class="footer-fox">
      <image class="footer-fox-img" :src="foxLogoUrl" mode="aspectFit" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useUserStore } from '@/stores/user'
// 与 static/fox-logo.png 同源；小程序包需走构建路径，勿单独依赖 /static/
import foxLogoUrl from './fox-logo.png'

const phone = ref('')
const password = ref('')
/** true=密文；false=明文。自定义眼睛，避免真机 iconfont 失效 */
const pwdMasked = ref(true)
const loading = ref(false)
const userStore = useUserStore()

function onEnterKey(e: KeyboardEvent) {
  if (e.key !== 'Enter') return
  e.preventDefault()
  void onSubmit()
}

onMounted(() => {
  if (userStore.token || uni.getStorageSync('token')) {
    uni.reLaunch({ url: '/pages/index/index' })
    return
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onEnterKey)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onEnterKey)
  }
})

function goRegister() {
  uni.navigateTo({ url: '/pages/register/register' })
}

async function onSubmit() {
  if (loading.value) return
  if (!/^1\d{10}$/.test(phone.value)) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' })
    return
  }
  if (!password.value) {
    uni.showToast({ title: '请输入密码', icon: 'none' })
    return
  }
  loading.value = true
  try {
    await userStore.login(phone.value, password.value)
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/index/index' })
    }, 400)
  } catch {
    //
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

/* 底部居中、正方形；距屏幕底边 2px — 图见 /static/fox-logo.png */
.footer-fox {
  position: fixed;
  left: 50%;
  bottom: 5px;
  transform: translateX(-50%);
  width: 88rpx;
  height: 88rpx;
  z-index: 10;
  pointer-events: none;
}
.footer-fox-img {
  width: 100%;
  height: 100%;
  display: block;
}

/* 密码可见性：纯 CSS，不依赖 up-icon */
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
    
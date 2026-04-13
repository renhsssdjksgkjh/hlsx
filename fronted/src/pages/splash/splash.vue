<template>
  <view class="splash-page">
    <!-- 使用构建产物路径，避免依赖根目录 static 拷贝（部分环境下 /static 未进包会 500） -->
    <image class="splash-img" :src="splashSrc" mode="aspectFill" />
  </view>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
// 与页面同目录引用，构建后进包路径稳定；勿用 /static/xxx（根目录 static 未必拷贝进 mp 包）
import splashSrc from './splash.png'

let timer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  const token = uni.getStorageSync('token') as string
  if (token) {
    uni.reLaunch({ url: '/pages/index/index' })
    return
  }
  timer = setTimeout(() => {
    uni.reLaunch({ url: '/pages/login/login' })
  }, 3000)
})

onUnmounted(() => {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
})
</script>

<style scoped lang="scss">
.splash-page {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #faf9f6;
}

.splash-img {
  width: 100%;
  height: 100%;
  display: block;
}
</style>

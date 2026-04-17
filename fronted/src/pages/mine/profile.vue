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
      <view class="profile-hero__hint">
        <text class="profile-hero__hint-text">点击头像更换</text>
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
        <u-text text="手机号" size="14" color="#555" />
        <u-gap height="8" />
        <view class="readonly-field">{{ userStore.user?.phone || '—' }}</view>
        <u-gap height="20" />
        <u-text text="注册时间" size="14" color="#555" />
        <u-gap height="8" />
        <view class="readonly-field">{{ formatDt(userStore.user?.created_at) }}</view>
        <u-gap height="20" />
        <u-text text="最近更新" size="14" color="#555" />
        <u-gap height="8" />
        <view class="readonly-field">{{ formatDt(userStore.user?.updated_at) }}</view>
        <u-gap height="24" />
        <u-text text="昵称" size="14" color="#555" />
        <u-gap height="8" />
        <u-input
          v-model="nickname"
          border="surround"
          placeholder="最多 64 字"
          maxlength="64"
          cursor-color="#ff7000"
        />
        <u-gap height="20" />
        <u-text text="个人签名" size="14" color="#555" />
        <u-gap height="8" />
        <textarea
          v-model="signature"
          class="sig-textarea"
          placeholder="最多 255 字"
          maxlength="255"
          :auto-height="true"
        />
        <u-gap height="24" />
        <u-button
          text="保存"
          type="primary"
          size="large"
          :loading="saveLoading"
          :custom-style="{ width: '100%' }"
          @click="onSave"
        />
      </template>
    </u-card>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { uploadAvatar, userAvatarDisplaySrc, updateProfile } from '@/api/auth'
import { compressImageToMaxSize } from '@/utils/compressImage'

const userStore = useUserStore()
const avatarUploading = ref(false)
const saveLoading = ref(false)
const nickname = ref('')
const signature = ref('')

function formatDt(raw?: string | null) {
  if (!raw) return '—'
  const d = new Date(String(raw).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return raw
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

function syncFromStore() {
  const u = userStore.user
  nickname.value = u?.nickname ?? ''
  signature.value = u?.signature ?? ''
}

watch(
  () => userStore.user,
  () => syncFromStore(),
  { deep: true }
)

onShow(async () => {
  if (!userStore.token) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  await userStore.loadProfile()
  syncFromStore()
})

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
        syncFromStore()
        uni.showToast({ title: '头像已更新', icon: 'success' })
      } catch {
        // toast 已在 uploadAvatar / loadProfile 中处理
      } finally {
        avatarUploading.value = false
      }
    },
  })
}

async function onSave() {
  if (saveLoading.value) return
  const n = nickname.value.trim()
  const s = signature.value.trim()
  const cur = userStore.user
  if (!cur) return
  const sameNick = (cur.nickname ?? '') === n
  const sameSig = (cur.signature ?? '') === s
  if (sameNick && sameSig) {
    uni.showToast({ title: '没有修改', icon: 'none' })
    return
  }
  saveLoading.value = true
  try {
    const body: { nickname?: string | null; signature?: string | null } = {}
    if (!sameNick) body.nickname = n || null
    if (!sameSig) body.signature = s || null
    await updateProfile(body)
    await userStore.loadProfile()
    syncFromStore()
    uni.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/mine/mine' })
    }, 400)
  } catch {
    // toast 已在 request 中处理
  } finally {
    saveLoading.value = false
  }
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

.profile-hero__hint {
  flex: 1;
  margin-left: 24rpx;
  min-width: 0;
}

.profile-hero__hint-text {
  color: rgba(255, 255, 255, 0.95);
  font-size: 28rpx;
}

.readonly-field {
  padding: 20rpx 24rpx;
  border-radius: 8rpx;
  background: #f5f6f7;
  color: #606266;
  font-size: 28rpx;
  line-height: 1.5;
}

.sig-textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 20rpx 24rpx;
  box-sizing: border-box;
  border-radius: 8rpx;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  font-size: 28rpx;
  line-height: 1.5;
  color: #303133;
}
</style>

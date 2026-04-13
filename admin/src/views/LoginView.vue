<template>
  <div class="login-page">
    <div class="bg-aurora" aria-hidden="true" />
    <div class="bg-grid" aria-hidden="true" />
    <div class="login-card">
      <div class="brand">
        <div class="logo-ring">
          <span class="logo-inner">狐</span>
        </div>
        <h1>狐灵商学</h1>
        <p class="sub">管理后台</p>
      </div>
      <el-form class="form" @submit.prevent="onSubmit">
        <el-form-item>
          <el-input
            v-model="username"
            size="large"
            placeholder="账号"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="password"
            type="password"
            size="large"
            placeholder="密码"
            show-password
            :prefix-icon="Lock"
            @keyup.enter="onSubmit"
          />
        </el-form-item>
        <el-button
          type="primary"
          size="large"
          class="submit"
          :loading="loading"
          native-type="submit"
        >
          登 录
        </el-button>
      </el-form>
      <p class="hint">默认账号 <code>admin</code> · 密码 <code>admin123</code></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { adminLogin } from '@/api/http'

const router = useRouter()
const auth = useAuthStore()

const username = ref('admin')
const password = ref('admin123')
const loading = ref(false)

async function onSubmit() {
  if (!username.value.trim() || !password.value) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  loading.value = true
  try {
    const { token } = await adminLogin(username.value.trim(), password.value)
    auth.setToken(token)
    ElMessage.success('登录成功')
    await router.replace({ name: 'users' })
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message: string }).message)
        : '登录失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: #0a0a12;
}

.bg-aurora {
  position: absolute;
  inset: -40%;
  background:
    radial-gradient(ellipse 80% 50% at 20% 40%, rgba(120, 80, 255, 0.35), transparent 50%),
    radial-gradient(ellipse 60% 40% at 80% 60%, rgba(0, 200, 220, 0.25), transparent 45%),
    radial-gradient(ellipse 50% 30% at 50% 100%, rgba(255, 100, 160, 0.15), transparent 40%);
  animation: drift 18s ease-in-out infinite alternate;
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 70%);
}

@keyframes drift {
  0% {
    transform: translate(0, 0) rotate(0deg);
  }
  100% {
    transform: translate(3%, 2%) rotate(2deg);
  }
}

.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
  margin: 1rem;
  padding: 2.25rem 2rem 1.5rem;
  border-radius: 20px;
  background: rgba(18, 20, 35, 0.72);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.05) inset,
    0 24px 80px rgba(0, 0, 0, 0.45);
}

.brand {
  text-align: center;
  margin-bottom: 1.75rem;
}

.logo-ring {
  width: 64px;
  height: 64px;
  margin: 0 auto 1rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #7c5cff, #00d4aa);
  padding: 3px;
  animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(124, 92, 255, 0.35);
  }
  50% {
    box-shadow: 0 0 24px 4px rgba(0, 212, 170, 0.25);
  }
}

.logo-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #121423;
  color: #fff;
  font-size: 1.5rem;
  font-weight: 700;
}

.brand h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.08em;
}

.sub {
  margin: 0.35rem 0 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.45);
}

.form :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.06);
  box-shadow: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.form :deep(.el-input__inner) {
  color: #fff;
}

.submit {
  width: 100%;
  margin-top: 0.5rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  border: none;
  background: linear-gradient(90deg, #7c5cff, #5c9cff);
}

.hint {
  margin: 1.25rem 0 0;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
}

.hint code {
  color: rgba(0, 212, 170, 0.85);
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 6px;
  border-radius: 4px;
}
</style>

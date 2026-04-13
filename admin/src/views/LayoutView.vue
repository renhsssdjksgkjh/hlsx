<template>
  <el-container class="layout">
    <el-aside width="220px" class="aside">
      <div class="aside-head">
        <span class="aside-title">狐灵商学</span>
        <span class="aside-badge">Admin</span>
      </div>
      <el-menu
        :default-active="active"
        router
        background-color="transparent"
        text-color="rgba(255,255,255,0.75)"
        active-text-color="#7c5cff"
      >
        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <span>用户信息</span>
        </el-menu-item>
        <el-menu-item index="/videos">
          <el-icon><VideoPlay /></el-icon>
          <span>视频列表</span>
        </el-menu-item>
        <el-menu-item index="/password">
          <el-icon><Key /></el-icon>
          <span>修改密码</span>
        </el-menu-item>
      </el-menu>
      <div class="aside-foot">
        <el-button type="danger" plain size="small" @click="logout">退出登录</el-button>
      </div>
    </el-aside>
    <el-main class="main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { User, VideoPlay, Key } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const active = computed(() => route.path)

async function logout() {
  try {
    await ElMessageBox.confirm('确定退出登录？', '提示', {
      type: 'warning',
      confirmButtonText: '退出',
      cancelButtonText: '取消',
    })
    auth.clear()
    router.replace({ name: 'login' })
  } catch {
    /* cancel */
  }
}
</script>

<style scoped>
.layout {
  height: 100vh;
  background: linear-gradient(145deg, #f0f2f8 0%, #e8ecf4 100%);
}

.aside {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #1a1d2e 0%, #12141f 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.aside-head {
  padding: 1.25rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.aside-title {
  display: block;
  font-weight: 700;
  font-size: 1.05rem;
  color: #fff;
  letter-spacing: 0.06em;
}

.aside-badge {
  display: inline-block;
  margin-top: 0.35rem;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(124, 92, 255, 0.25);
  color: #b8a8ff;
}

.aside :deep(.el-menu) {
  border: none;
  flex: 1;
  padding-top: 0.5rem;
}

.aside :deep(.el-menu-item) {
  margin: 4px 8px;
  border-radius: 8px;
}

.aside :deep(.el-menu-item.is-active) {
  background: rgba(124, 92, 255, 0.15) !important;
}

.aside-foot {
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.main {
  padding: 1.5rem 1.75rem;
  overflow: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

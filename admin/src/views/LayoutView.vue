<template>
  <div class="layout-root">
  <el-container class="layout">
    <el-aside
      :width="asideCollapsed ? '0px' : '220px'"
      :class="['aside', { 'aside--no-transition': asideNoTransition }]"
    >
      <div class="aside-inner">
        <div class="aside-head">
          <img class="aside-logo" src="/fox-logo.png" alt="狐灵商学" width="36" height="36" />
          <div class="aside-brand-text">
            <span class="aside-title">狐灵商学</span>
            <span class="aside-badge">Admin</span>
          </div>
        </div>
        <el-menu
          :default-active="active"
          router
          background-color="transparent"
          text-color="rgba(255,255,255,0.75)"
          active-text-color="#7c5cff"
        >
          <el-menu-item index="/dashboard">
            <el-icon><DataAnalysis /></el-icon>
            <span>概览</span>
          </el-menu-item>
          <el-menu-item index="/users">
            <el-icon><User /></el-icon>
            <span>用户信息</span>
          </el-menu-item>
          <el-menu-item index="/videos">
            <el-icon><VideoPlay /></el-icon>
            <span>视频列表</span>
          </el-menu-item>
          <el-menu-item index="/notices">
            <el-icon><Bell /></el-icon>
            <span>群公告管理</span>
          </el-menu-item>
          <el-menu-item index="/password">
            <el-icon><Key /></el-icon>
            <span>修改密码</span>
          </el-menu-item>
        </el-menu>
        <div class="aside-foot">
          <el-button type="danger" plain size="small" @click="logout">退出登录</el-button>
        </div>
      </div>
    </el-aside>
    <el-main class="main">
      <div class="tags-bar" role="tablist" aria-label="页面标签">
        <button
          v-for="tab in tabsStore.tabs"
          :key="tab.fullPath"
          type="button"
          class="tag-item"
          :class="{ active: isTabActive(tab.fullPath) }"
          role="tab"
          :aria-selected="isTabActive(tab.fullPath)"
          @click="goTab(tab.fullPath)"
        >
          <span class="tag-text">{{ tab.title }}</span>
          <span
            v-if="tab.closable"
            class="tag-close"
            aria-label="关闭"
            @click.stop="tabsStore.removeTab(tab.fullPath)"
          >
            <el-icon :size="14"><Close /></el-icon>
          </span>
        </button>
      </div>
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </el-main>
  </el-container>
  <button
    type="button"
    class="aside-toggle"
    :class="{ 'aside-toggle--no-transition': asideNoTransition }"
    :style="toggleStyle"
    :aria-expanded="!asideCollapsed"
    :aria-label="asideCollapsed ? '展开侧栏' : '收起侧栏'"
    @click="toggleAside"
  >
    <el-icon :size="18">
      <Expand v-if="asideCollapsed" />
      <Fold v-else />
    </el-icon>
  </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DataAnalysis, User, VideoPlay, Bell, Key, Close, Fold, Expand } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useTabsStore } from '@/stores/tabs'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tabsStore = useTabsStore()

const active = computed(() => route.path)

const asideCollapsed = ref(false)
/** 为 true 时侧栏宽度变化无过渡（用于展开时立刻弹出） */
const asideNoTransition = ref(false)

/** 与侧栏右缘对齐；收起后固定在视口左缘，避免被 width:0 裁切 */
const toggleStyle = computed(() => {
  if (asideCollapsed.value) {
    return { left: '0px', transform: 'translateY(-50%)' }
  }
  return { left: '220px', transform: 'translate(-100%, -50%)' }
})

function toggleAside() {
  if (asideCollapsed.value) {
    asideNoTransition.value = true
    asideCollapsed.value = false
    void nextTick(() => {
      requestAnimationFrame(() => {
        asideNoTransition.value = false
      })
    })
  } else {
    asideCollapsed.value = true
  }
}

function isTabActive(fullPath: string) {
  return route.fullPath === fullPath || route.path === fullPath
}

function goTab(fullPath: string) {
  if (route.fullPath !== fullPath) router.push(fullPath)
}

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
.layout-root {
  position: relative;
  height: 100vh;
  width: 100%;
}

.layout {
  height: 100vh;
  background: linear-gradient(145deg, #f0f2f8 0%, #e8ecf4 100%);
}

.aside {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(180deg, #1a1d2e 0%, #12141f 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  transition: width 1.5s ease;
}

.aside--no-transition {
  transition: none !important;
}

/** 固定 220px 排版，父级变窄时裁切，文字不因父宽换行 */
.aside-inner {
  box-sizing: border-box;
  width: 220px;
  min-width: 220px;
  flex: 1;
  min-height: 0;
  align-self: stretch;
  display: flex;
  flex-direction: column;
}

.aside-toggle {
  position: fixed;
  top: 50%;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 48px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-left: none;
  border-radius: 0 10px 10px 0;
  background: linear-gradient(180deg, #9b7cff 0%, #7c5cff 45%, #6346d8 100%);
  color: #fff;
  cursor: pointer;
  box-shadow:
    0 4px 18px rgba(124, 92, 255, 0.55),
    2px 0 14px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
  transition:
    left 1.5s ease,
    transform 1.5s ease,
    filter 0.2s ease,
    box-shadow 0.2s ease;
}

.aside-toggle:hover {
  color: #fff;
  filter: brightness(1.08);
  box-shadow:
    0 6px 22px rgba(124, 92, 255, 0.65),
    2px 0 16px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.aside-toggle:focus-visible {
  outline: 2px solid #c4b5fd;
  outline-offset: 2px;
}

.aside-toggle:active {
  filter: brightness(0.96);
}

.aside-toggle--no-transition {
  transition: none !important;
}

.aside-toggle .el-icon {
  transition: transform 0.2s ease;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.25));
}

.aside-head {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 1.25rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.aside-logo {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.aside-brand-text {
  min-width: 0;
}

.aside-title {
  display: block;
  font-weight: 700;
  font-size: 1.05rem;
  color: #fff;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.aside-badge {
  display: inline-block;
  margin-top: 0.35rem;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(124, 92, 255, 0.25);
  color: #b8a8ff;
  white-space: nowrap;
}

.aside-inner :deep(.el-menu) {
  border: none;
  flex: 1;
  padding-top: 0.5rem;
}

.aside-inner :deep(.el-menu-item) {
  margin: 4px 8px;
  border-radius: 8px;
  white-space: nowrap;
}

.aside-inner :deep(.el-menu-item.is-active) {
  background: rgba(124, 92, 255, 0.15) !important;
}

.aside-foot {
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.aside-foot :deep(.el-button) {
  white-space: nowrap;
}

.main {
  padding: 0 1.75rem 1.5rem;
  overflow: auto;
}

.tags-bar {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  margin-left: -1.75rem;
  margin-right: -1.75rem;
    margin-bottom: 4px;
  padding: 12px 1.75rem 10px;
  overflow-x: auto;
  background: #fff;
  border-bottom: 1px solid rgba(26, 29, 46, 0.08);
}

.tag-item {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 200px;
  padding: 8px 12px;
  margin-bottom: -1px;
  border: 1px solid transparent;
  border-radius: 8px 8px 0 0;
  background: rgba(26, 29, 46, 0.05);
  color: #4b5563;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  line-height: 1.2;
}

.tag-item:hover {
  background: rgba(26, 29, 46, 0.08);
  color: #1a1d2e;
}

.tag-item.active {
  background: #fff;
  color: #1a1d2e;
  border-color: rgba(26, 29, 46, 0.1);
  border-bottom-color: #fff;
  font-weight: 600;
  box-shadow: 0 -1px 0 #7c5cff inset;
}

.tag-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 2px;
  padding: 2px;
  border-radius: 4px;
  color: #9ca3af;
}

.tag-close:hover {
  color: #1a1d2e;
  background: rgba(26, 29, 46, 0.08);
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

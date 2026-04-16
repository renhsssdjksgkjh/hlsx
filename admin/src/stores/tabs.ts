import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import router from '@/router'

const LAYOUT_NAMES = new Set(['dashboard', 'users', 'videos', 'password'])

export type TabItem = {
  fullPath: string
  name: string
  title: string
  closable: boolean
}

function defaultTabs(): TabItem[] {
  return [
    {
      fullPath: '/dashboard',
      name: 'dashboard',
      title: '概览',
      closable: false,
    },
  ]
}

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<TabItem[]>(defaultTabs())

  function addTab(to: RouteLocationNormalized) {
    const name = to.name
    if (typeof name !== 'string' || !LAYOUT_NAMES.has(name)) return
    const title = (to.meta?.title as string) || name
    const fullPath = to.fullPath
    const closable = to.meta?.affix !== true
    if (tabs.value.some((t) => t.fullPath === fullPath)) return
    tabs.value.push({
      fullPath,
      name,
      title,
      closable,
    })
  }

  function removeTab(fullPath: string) {
    const i = tabs.value.findIndex((t) => t.fullPath === fullPath)
    if (i < 0) return
    const tab = tabs.value[i]
    if (!tab.closable) return
    const wasActive = router.currentRoute.value.fullPath === fullPath
    const prev = tabs.value[i - 1]
    const next = tabs.value[i + 1]
    tabs.value.splice(i, 1)
    if (wasActive) {
      const target = prev || next || tabs.value[0]
      if (target) router.push(target.fullPath)
    }
  }

  function reset() {
    tabs.value = defaultTabs()
  }

  return { tabs, addTab, removeTab, reset }
})

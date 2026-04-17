import { ref } from 'vue'
import { onHide } from '@dcloudio/uni-app'

export interface UseScrollBackTopOptions {
  /** 超过此距离显示回顶按钮，默认 80 */
  threshold?: number
  /** 传入时 onHide 写入列表滚动位置，回顶时写 0 */
  listScrollStorageKey?: string
}

/** 各端 onPageScroll 入参不一致：有的为 { scrollTop }，有的包在 detail 里 */
export function extractPageScrollTop(e: unknown): number {
  if (e == null || typeof e !== 'object') return 0
  const o = e as Record<string, unknown>
  if (typeof o.scrollTop === 'number' && !Number.isNaN(o.scrollTop)) return o.scrollTop
  const d = o.detail
  if (d != null && typeof d === 'object' && 'scrollTop' in d) {
    const t = (d as { scrollTop?: unknown }).scrollTop
    if (typeof t === 'number' && !Number.isNaN(t)) return t
  }
  return 0
}

/**
 * 页面滚动状态请在 **页面 .vue 根 script** 中绑定：
 * `import { onPageScroll } from '@dcloudio/uni-app'`
 * `const { handlePageScroll, ... } = useScrollBackTop(...)`
 * `onPageScroll(handlePageScroll)`
 * 若在 composable 内部调用 onPageScroll，编译到微信小程序时可能无法注入到 Page，导致 scrollTop 始终为 0。
 */
export function useScrollBackTop(options: UseScrollBackTopOptions = {}) {
  const threshold = options.threshold ?? 80
  const storageKey = options.listScrollStorageKey

  const showBackTop = ref(false)
  const listScrollYTrack = ref(0)
  const pageScrollYTrack = ref(0)
  const scrollViewKey = ref(0)
  let savedListScrollTop = 0
  let backTopLastAt = 0

  function syncBackTopFabVisibility() {
    const y = Math.max(listScrollYTrack.value, pageScrollYTrack.value)
    const shouldShow = y > threshold
    if (shouldShow !== showBackTop.value) {
      showBackTop.value = shouldShow
    }
  }

  function onListScroll(e: { detail?: { scrollTop?: number }; target?: { scrollTop?: number } }) {
    const raw = e.detail?.scrollTop ?? (e.target as { scrollTop?: number })?.scrollTop ?? 0
    const y = Number(raw)
    savedListScrollTop = y
    listScrollYTrack.value = y
    syncBackTopFabVisibility()
  }

  /** 供页面内 `onPageScroll(handlePageScroll)` 使用 */
  function handlePageScroll(e: unknown) {
    const st = extractPageScrollTop(e)
    pageScrollYTrack.value = st
    savedListScrollTop = st
    syncBackTopFabVisibility()
  }

  function onBackTop() {
    const now = Date.now()
    if (now - backTopLastAt < 350) return
    backTopLastAt = now
    uni.pageScrollTo({ scrollTop: 0, duration: 0 })
    scrollViewKey.value += 1
    savedListScrollTop = 0
    listScrollYTrack.value = 0
    pageScrollYTrack.value = 0
    showBackTop.value = false
    if (storageKey) {
      uni.setStorageSync(storageKey, 0)
    }
  }

  function resetListScrollState() {
    savedListScrollTop = 0
    listScrollYTrack.value = 0
    pageScrollYTrack.value = 0
    showBackTop.value = false
    if (storageKey) {
      uni.setStorageSync(storageKey, 0)
    }
  }

  if (storageKey) {
    onHide(() => {
      const y = Math.max(listScrollYTrack.value, pageScrollYTrack.value, savedListScrollTop)
      uni.setStorageSync(storageKey, y)
    })
  }

  return {
    showBackTop,
    scrollViewKey,
    onListScroll,
    handlePageScroll,
    onBackTop,
    resetListScrollState,
  }
}

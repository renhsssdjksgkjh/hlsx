import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import uviewPlus, { setConfig } from 'uview-plus'
// 内置图标字体改为本地打包，避免小程序请求 at.alicdn.com（需配域名且易出现 ERR_CACHE_MISS）
import uviewIconFontUrl from '@/assets/uview-iconfont.ttf'
import App from './App.vue'

setConfig({
  config: {
    iconUrl: uviewIconFontUrl,
  },
})

export function createApp() {
  const app = createSSRApp(App)
  app.use(createPinia())
  app.use(uviewPlus)
  return { app }
}

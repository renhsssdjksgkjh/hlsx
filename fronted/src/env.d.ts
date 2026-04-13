/// <reference types="@dcloudio/types" />
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

/** 构建时由 @dcloudio/vite-plugin-uni 注入；此处仅用于 IDE 类型检查 */
declare module '@dcloudio/uni-app' {
  export function onLaunch(callback: () => void): void
  export function onShow(callback: () => void): void
  export function onHide(callback: () => void): void
  export function onLoad(callback: (query: Record<string, string | undefined>) => void): void
  export function onUnload(callback: () => void): void
  export function onReady(callback: () => void): void
}

interface ImportMetaEnv {
  readonly VITE_API_BASE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** uview-plus 运行时支持 `config.iconUrl`（见 node_modules/uview-plus/libs/config/config.js），类型定义未列出 */
declare module 'uview-plus' {
  interface Config {
    iconUrl?: string
  }
}

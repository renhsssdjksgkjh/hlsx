import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { resolve } from 'path'
import fs from 'fs'
import path from 'path'

// 仅 H5 部署在子路径 /hry/；小程序若共用 base 可能导致本地图在模拟器里解析异常
const isH5 =
  process.env.UNI_PLATFORM === 'h5' || process.env.UNI_PLATFORM === 'web'

const TAB_BAR_FILES = [
  'tab-list.png',
  'tab-list-active.png',
  'tab-progress.png',
  'tab-progress-active.png',
  'tab-wrong.png',
  'tab-wrong-active.png',
  'tab-mine.png',
  'tab-mine-active.png',
]

function copyFileIfExists(from: string, to: string) {
  if (fs.existsSync(from)) fs.copyFileSync(from, to)
}

/** 将 static/course/ 下配图复制到小程序产物（原先只拷 tab 图标，course 未进包会导致图片 500） */
function copyCourseImagesToMpDist(destStatic: string) {
  const root = __dirname
  const courseSrc = path.join(root, 'static', 'course')
  if (!fs.existsSync(courseSrc)) return
  const courseDest = path.join(destStatic, 'course')
  fs.mkdirSync(courseDest, { recursive: true })
  for (const name of fs.readdirSync(courseSrc)) {
    const s = path.join(courseSrc, name)
    if (fs.statSync(s).isFile()) copyFileIfExists(s, path.join(courseDest, name))
  }
}

/**
 * 将 static 中 tabBar 图标与 course 子目录复制到微信小程序产物 static/。
 */
function copyStaticDirToMpDist() {
  if (process.env.UNI_PLATFORM !== 'mp-weixin') return
  const root = __dirname
  const srcDir = path.join(root, 'static')
  const outDirs = [
    path.join(root, 'dist', 'build', 'mp-weixin', 'static'),
    path.join(root, 'dist', 'dev', 'mp-weixin', 'static'),
  ]
  try {
    if (!fs.existsSync(srcDir)) return
    for (const destDir of outDirs) {
      fs.mkdirSync(destDir, { recursive: true })
      for (const f of TAB_BAR_FILES) {
        copyFileIfExists(path.join(srcDir, f), path.join(destDir, f))
      }
      copyCourseImagesToMpDist(destDir)
    }
  } catch {
    //
  }
}

function copyStaticDirToMp() {
  return {
    name: 'copy-static-dir-mp',
    buildStart() {
      copyStaticDirToMpDist()
    },
    closeBundle() {
      copyStaticDirToMpDist()
    },
  }
}

export default defineConfig({
  base: isH5 ? '/hry/' : '/',
  plugins: [uni(), copyStaticDirToMp()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['legacy-js-api', 'color-functions', 'import'],
      },
    },
  },
})

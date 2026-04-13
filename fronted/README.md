# 狐灵商学（UniApp 前端）

Vue 3 组合式 API + Pinia，对接 `backend` 已提供的 REST 接口。

## 开发

```bash
cd fronted
npm install
npm run dev
```

`npm run dev` 与 `npm run dev:mp-weixin` 相同，均为微信小程序开发模式。也可用 `npm run dev:h5` 在浏览器调试。

安装时若出现 `vue` / `vue-router` 的 **peer dependency** 警告，多来自 `@dcloudio/uni-h5` 内置的旧版 `vue`，一般**可忽略**，不影响 `mp-weixin` 编译。

- **开发模式**（`npm run dev`）：导入 `fronted/dist/dev/mp-weixin`。  
- **发行构建**（`npm run build:mp-weixin`）：导入 `fronted/dist/build/mp-weixin`（以终端提示为准）。

## 环境变量

复制 `.env.development`，按需修改：

- `VITE_API_BASE`：后端 API 根地址，默认 `http://localhost:3001`。

本地调试请在微信开发者工具中勾选「不校验合法域名」；真机/上线需 HTTPS 域名并在小程序后台配置。

## 页面说明

| 页面 | 说明 |
|------|------|
| `pages/login/login` | 手机号 + 密码登录 |
| `pages/index/index` | 视频课程列表，入口「我的」 |
| `pages/video/play` | 播放视频，定时上报 `position_sec`，退出再保存一次 |
| `pages/quiz/quiz` | 单选 / 多选 / 判断，提交后展示解析 |
| `pages/mine/mine` | 个人信息、修改密码、退出 |

## 接口对应关系

与 `backend` 中路由一致：`/api/auth/login`、`/api/auth/me`、`/api/user/password`、`/api/videos`、`/api/videos/:id/progress`、`/api/videos/:id/questions`、`/api/videos/:id/quiz/submit`。

## 小程序 AppID

在 `src/manifest.json` → `mp-weixin.appid` 填写你的小程序 AppID。

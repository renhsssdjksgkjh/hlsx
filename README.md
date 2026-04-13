# 狐灵商学（试岗项目）

学员端学习应用：**UniApp** 多端（微信小程序 / H5）+ **Node.js（Express）** + **MySQL**。提供账号体系、课程列表与视频播放、学习进度、课堂测验、错题集与个人中心（含修改密码）等能力。

---

## 目录

- [功能一览](#功能一览)
- [仓库结构](#仓库结构)
- [技术栈](#技术栈)
- [环境要求](#环境要求)
- [使用说明](#使用说明)
  - [1. 后端 API](#1-后端-api)
  - [2. 前端 UniApp](#2-前端-uniapp)
  - [3. H5 打包与根目录 `h5/`](#3-h5-打包与根目录-h5)
  - [4. 管理后台 H5（`admin/`）](#4-管理后台-h5admin)
- [配置说明](#配置说明)
- [小程序静态资源说明](#小程序静态资源说明)
- [安全与隐私](#安全与隐私)
- [更多文档](#更多文档)

---

## 功能一览

### 账号与个人中心

| 功能 | 说明 |
|------|------|
| **启动页** | 应用启动展示，随后进入登录态判断或业务首页。 |
| **注册** | 手机号、密码、昵称等注册新学员账号。 |
| **登录** | 手机号 + 密码登录，成功后保存 JWT，进入带 Tab 的主界面。 |
| **我的** | 展示手机号、昵称；**修改密码**（原密码 + 新密码，至少 6 位）。保存成功后提示 **「密码保存成功！」**，约 1 秒后清除登录态并 **跳转登录页**，需用新密码重新登录。 |
| **退出登录** | 清除本地 token，跳转登录页。 |

### 课程与学习

| 功能 | 说明 |
|------|------|
| **课程列表（Tab）** | 单列纵向列表，每门课一张卡片：**上方为课程配图**（`fronted/static/course/course-01.png`～`course-15.png`，与 `sort_order` 1～15 对应；缺省时按列表顺序兜底），下方为 **课程标题** 与 **「课程 N」**（`sort_order`）。点击卡片有 **放大动画**，随后进入 **视频播放页**。H5 下图标路径会带上 `base`（如 `/hry/`），避免静态资源 404。 |
| **视频播放** | 在线播放；根据后端返回的 **`position_sec`** 恢复进度；上报学习进度（`PUT /api/videos/:id/progress`）。满足后端规则后可进入该课 **课堂测验**。 |
| **学习进度（Tab）** | 最多 **15** 门课：**进度百分比 = position_sec ÷ 视频总时长（秒）**。总时长优先取接口 **`duration_sec`**；若库中无时长，则使用前端内置的 15 段固定秒数（与课程序号对应）。百分比保留一位小数；**浅蓝色**横向条形图（微信小程序端为原生条形图以保证稳定显示）。**点击一行**进入对应课程播放页，并 **高亮当前行**。 |

### 测验与错题

| 功能 | 说明 |
|------|------|
| **课堂测验** | 在达到后端要求的观看进度后可进入；提交后展示成绩与解析。 |
| **错题集（Tab）** | 汇总答错题目，可进入 **错题详情** 查看解析。 |

### 端与构建形态

| 形态 | 说明 |
|------|------|
| **微信小程序** | 微信开发者工具导入 **`fronted/dist/build/mp-weixin`**（或 dev 目录）预览与上传。 |
| **H5** | 执行 `npm run build:h5`，产物用于静态托管或 FTP；默认静态资源前缀为 **`/hry/`**（见 `fronted/vite.config.ts`）。可将产物同步到仓库根目录 **`h5/`** 便于上传。 |

---

## 仓库结构

| 路径 | 说明 |
|------|------|
| `fronted/` | 前端：UniApp + Vue 3 + TypeScript + Pinia + [uview-plus](https://uview-plus.jiangruyi.com/) |
| `backend/` | 后端：Express REST API，数据表前缀 `hry_*` |
| `admin/` | **管理后台 H5**（Vue 3 + Vite + Element Plus）：学员用户与视频 CRUD、管理员改密；见下文 [管理后台](#管理后台-h5-admin) |
| `h5/` | **H5 发布用目录**：将 `npm run build:h5` 产物拷贝至此，便于 FTP 上传（部署 URL 需与 `base` 一致，见下文） |
| `ftp-upload/` | 可选：FTP 辅助静态页（非小程序运行时） |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | UniApp、Vue 3、TypeScript、Pinia、uview-plus |
| 后端 | Node.js 18+、Express、mysql2、JWT、bcryptjs |
| 数据库 | MySQL |

---

## 环境要求

- Node.js **18+**
- 可访问的 **MySQL**（表结构见 `backend/README.md`）
- 开发微信小程序时需安装 **微信开发者工具**

---

## 使用说明

### 1. 后端 API

```bash
cd backend
copy .env.example .env
```

编辑 `backend/.env`：配置 `PORT`、`DB_*`、`JWT_SECRET`、`JWT_EXPIRES_IN` 等（**勿将密钥与数据库密码提交到公开仓库**）。

```bash
npm install
npm start
```

默认监听 `http://localhost:3001`（以 `.env` 为准）。开发可用：

```bash
npm run dev
```

**接口说明与 Postman 示例** 见 **[backend/README.md](backend/README.md)**。

---

### 2. 前端 UniApp

```bash
cd fronted
npm install
```

通过 **`VITE_API_BASE`** 配置后端根地址（**不要**末尾斜杠）：

| 场景 | 文件 | 说明 |
|------|------|------|
| 本地开发 | `fronted/.env.development` | 如 `http://局域网IP:3001` |
| 生产构建 | `fronted/.env.production` | 线上 HTTPS API 根地址 |

**微信小程序（开发）**

```bash
npm run dev:mp-weixin
```

用微信开发者工具打开 **`fronted/dist/dev/mp-weixin`**（以实际输出为准）。

**微信小程序（发布）**

```bash
npm run build:mp-weixin
```

导入 **`fronted/dist/build/mp-weixin`** 上传代码。

**H5（本地调试）**

```bash
npm run dev:h5
```

按终端提示在浏览器访问。

---

### 3. H5 打包与根目录 `h5/`

1. 确认 **`fronted/.env.production`** 中 **`VITE_API_BASE`** 为线上 API。  
2. 打包：

```bash
cd fronted
npm run build:h5
```

3. 将 **`fronted/dist/build/h5/`** 下**全部文件**复制到项目根目录 **`h5/`**，覆盖旧文件，再上传 FTP 或 Web 服务器。

4. **部署路径**：当前 H5 的 `base` 为 **`/hry/`**，页面内资源形如 `/hry/assets/...`。服务器需能通过 **`https://你的域名/hry/`** 访问（例如把 `h5` 内文件放到站点 **`hry`** 目录下）。

若需部署在域名根路径（无 `/hry/` 前缀），需修改 **`fronted/vite.config.ts`** 中 H5 的 `base` 为 `'/'`，重新 `build:h5` 并覆盖 `h5/`。

---

### 4. 管理后台 H5（`admin/`）

独立 **Vue 3 + Vite + Element Plus** 单页应用，用于管理员登录后维护 **`hry_user`**（学员）、**`hry_video`**（视频），以及修改管理员密码。接口前缀为 **`/api/admin`**（与学员端 JWT 区分）。

**首次使用前（创建管理员表与默认账号）**

1. 已配置好 [`backend/.env`](backend/.env.example) 中的数据库连接。  
2. 在 `backend` 目录执行：

```bash
cd backend
npm run seed:admin
```

将自动创建 **`hry_admin`** 表（若不存在），并插入默认管理员 **`admin` / `admin123`**（若尚无 `admin` 用户）。**上线后请立即在后台「修改密码」中更换。**

**本地开发**

- **方式 A（一条命令）**：在 `admin` 目录同时启动后端与 Vite（需已安装依赖）：

```bash
cd admin
npm install
npm run dev:all
```

- **方式 B（两个终端）**：先 `cd backend && npm run dev`（或 `npm start`），再另开终端 `cd admin && npm run dev`。开发服务器会把 `/api` **代理到 `http://127.0.0.1:3001`**（与 `backend` 默认端口一致）。

若 Vite 报 **`ECONNREFUSED` / `http proxy error`**，说明 **3001 上还没有 API 在跑**，请先启动 `backend` 或使用 **`npm run dev:all`**。

浏览器访问 **`http://localhost:5174`**，使用 `admin` / `admin123` 登录。

**生产构建**

1. 在 **`admin/.env.production`** 中设置 **`VITE_API_BASE`** 为线上 **HTTPS** API 根地址（无末尾斜杠），例如 `https://api.example.com`。  
2. 执行 `cd admin && npm run build`，将 **`admin/dist/`** 静态文件部署到任意 Web 服务器；需与 API **同域或正确配置 CORS**。

---

## 配置说明

| 配置项 | 位置 | 说明 |
|--------|------|------|
| 数据库与 JWT | `backend/.env` | 端口、MySQL、JWT |
| 管理后台 API 地址 | `admin/.env.development`、`.env.production` | `VITE_API_BASE`（开发可留空走代理） |
| 前端 API 地址 | `fronted/.env.development`、`.env.production` | `VITE_API_BASE` |
| H5 静态资源前缀 | `fronted/vite.config.ts` | `base`（当前 H5 为 `/hry/`） |
| Tab 栏图标 | `fronted/static/*.png` | 小程序 `app.json` 引用 |
| 课程列表配图 | `fronted/static/course/course-01.png`～`course-15.png` | 与课程 `sort_order` 1～15 对应 |

---

## 小程序静态资源说明

微信小程序构建时，除 uni-app 默认处理外，**`vite.config.ts`** 会将 **`static/` 下 Tab 图标**以及 **`static/course/` 下全部配图**复制到产物 **`static/`**，避免课程封面在模拟器中报错或无法显示。若新增其它子目录静态资源，需同步扩展构建复制逻辑或放入已有约定目录。

---

## 安全与隐私

- 勿将 **`backend/.env`**、**`fronted/.env.*`**、**`admin/.env.*`**（含生产 API 地址）提交到公开仓库。  
- FTP 仅上传构建产物（如根目录 `h5/` 内容），勿上传 `node_modules`、含密钥的源码配置。  
- 生产环境定期更换 JWT 密钥与数据库密码。

---

## 更多文档

- **[backend/README.md](backend/README.md)**：表结构、REST 接口、Postman 调试。

---

*若与当前代码不一致，以仓库内实现为准。*

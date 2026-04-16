# 狐灵商学

学员端（微信小程序 / H5）、管理后台与一套 **Node.js + Express + MySQL** API 组成的完整项目。数据表统一使用 `hry_*` 前缀。

| 子项目 | 说明 |
|--------|------|
| [fronted/](fronted/) | UniApp + Vue 3：课程学习、视频进度、课堂测验、错题集、个人中心 |
| [backend/](backend/) | REST API、JWT（学员端与管理端分离） |
| [admin/](admin/) | Vue 3 + Vite + Element Plus：学员与视频维护、学情与统计 |

更细的接口与表结构见 **[backend/README.md](backend/README.md)**。

---

## 技术栈

- **运行时**：Node.js 18+
- **后端**：Express、mysql2、JWT、bcryptjs
- **数据库**：MySQL
- **学员端**：UniApp、Vue 3、TypeScript、Pinia、uview-plus
- **管理端**：Vue 3、Vite、Element Plus、ECharts

---

## 环境要求

- Node.js **18+**
- **MySQL**（建表与初始化说明见 `backend/README.md`）
- 开发微信小程序时需安装 **微信开发者工具**

---

## 快速开始

### 1. 后端

```bash
cd backend
copy .env.example .env   # Linux / macOS: cp .env.example .env
```

编辑 `backend/.env`：配置 `PORT`、`DB_*`、`JWT_SECRET`、`JWT_EXPIRES_IN` 等。**勿将真实密钥与数据库密码提交到公开仓库。**

```bash
npm install
npm start
```

默认监听 `http://localhost:3001`（以 `.env` 为准）。开发可用热重载：

```bash
npm run dev
```

### 2. 管理端默认账号（首次）

在已配置数据库的前提下：

```bash
cd backend
npm run seed:admin
```

会创建 `hry_admin` 表（若不存在）并写入默认管理员 **`admin` / `admin123`**（若尚无 `admin` 用户）。**上线后请立即在后台修改密码。**

### 3. 学员端 UniApp（`fronted/`）

```bash
cd fronted
npm install
```

通过环境变量 **`VITE_API_BASE`** 指向后端根地址（**不要**末尾斜杠）：

| 文件 | 用途 |
|------|------|
| `fronted/.env.development` | 本地 / 局域网调试，如 `http://192.168.x.x:3001` |
| `fronted/.env.production` | 生产构建（H5 / 小程序正式包） |

**微信小程序**

```bash
npm run dev:mp-weixin    # 开发：导入 dist/dev/mp-weixin（以实际输出为准）
npm run build:mp-weixin  # 发布：导入 dist/build/mp-weixin
```

**H5**

```bash
npm run dev:h5
npm run build:h5
```

当前 H5 的 `base` 为 **`/hry/`**（见 `fronted/vite.config.ts`），部署时需能通过 `https://你的域名/hry/` 访问静态资源。若需根路径部署，修改 `base` 后重新打包。

可将 `fronted/dist/build/h5/` 产物同步到仓库根目录 **`h5/`**，便于 FTP 或静态服务器发布（与现有文档习惯一致）。

### 4. 管理后台（`admin/`）

```bash
cd admin
npm install
```

开发时 **先保证后端在 3001 端口运行**，再启动管理端：

```bash
npm run dev
```

或一条命令同时起后端与本项目 Vite（端口 **5174**，`/api` 代理到 `http://127.0.0.1:3001`）：

```bash
npm run dev:all
```

浏览器访问 **http://localhost:5174**。生产构建：`npm run build`，部署 `admin/dist/`；在 **`admin/.env.production`** 中设置 **`VITE_API_BASE`** 为线上 HTTPS API 根地址（无末尾斜杠），需与 API **同域或配置 CORS**。

---

## 常用命令

| 目录 | 命令 | 作用 |
|------|------|------|
| `backend/` | `npm start` / `npm run dev` | 生产 / 开发 API |
| `backend/` | `npm run seed:admin` | 初始化管理员表与默认账号 |
| `fronted/` | `npm run dev:mp-weixin` | 微信小程序开发构建 |
| `fronted/` | `npm run build:mp-weixin` | 微信小程序发布构建 |
| `fronted/` | `npm run dev:h5` / `npm run build:h5` | H5 开发 / 生产 |
| `admin/` | `npm run dev` | 管理后台开发服务器 |
| `admin/` | `npm run dev:all` | 后端 + 管理后台同时开发 |
| `admin/` | `npm run build` | 管理后台生产构建 |

---

## 配置项速查

| 项 | 位置 |
|----|------|
| 数据库、端口、JWT | `backend/.env` |
| 学员端 API 根地址 | `fronted/.env.development`、`.env.production` 中的 `VITE_API_BASE` |
| 管理端 API 根地址 | `admin/.env.production` 中的 `VITE_API_BASE`（开发可走 Vite 代理，可不配） |
| H5 资源前缀 | `fronted/vite.config.ts` 中 H5 的 `base` |

---

## 小程序静态资源

构建时 `fronted/vite.config.ts` 会将 Tab 图标与 `static/course/` 等约定目录复制进小程序产物，避免模拟器中图片缺失。新增静态目录时请同步构建逻辑或放入已有约定路径。

---

## 安全提示

- 不要将含真实密钥的 `.env`、生产环境配置提交到公开仓库。
- 生产环境定期更换 `JWT_SECRET` 与数据库密码；FTP 仅上传构建产物。

---

*实现细节以仓库内代码为准。*

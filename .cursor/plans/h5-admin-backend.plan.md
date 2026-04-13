# H5 后台管理系统（计划 · 已迭代）

## 目录约定（本次明确）

- **项目根目录**：`D:\桌面\游帆科技\试岗\huling\`（与 `backend/`、`fronted/` 同级）。
- **后台管理 H5 全部内容**必须放在根目录下的 **`admin/`** 文件夹内，包括但不限于：
  - `admin/package.json`、`admin/vite.config.ts`、`admin/tsconfig.json`
  - `admin/index.html`
  - `admin/src/`（入口、路由、页面、组件、样式、API 封装等）
  - `admin/public/`（若有静态资源）
  - 环境配置如 `admin/.env.development`（不提交密钥；`.gitignore` 按需忽略）

不在 `fronted/` 内嵌后台页面，保持 uni-app 学员端与后台管理分离。

## 架构（不变）

- 后端：在现有 [`backend/`](../../backend/) 中新增 `hry_admin` 表、`/api/admin/*` 路由与 `adminAuth` 中间件。
- 前端：仅 [`admin/`](../../admin/) 内为 Vite + Vue3 纯 H5 SPA。

## 实施待办（与之前一致，路径锚定在根目录 `admin/`）

1. SQL + 种子：`backend/sql/hry_admin.sql` 等。
2. 后端：`/api/admin` 登录、改密、用户/视频 CRUD。
3. **`admin/`**：炫酷登录页、两栏布局、用户信息 / 视频列表 / 修改密码三模块。
4. README：说明 `cd admin && npm install && npm run dev` 与部署产物目录 `admin/dist`。

---

*若与全局 Cursor 计划文件重复，以本文件对 `admin/` 目录的约束为准。*

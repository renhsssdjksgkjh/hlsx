# 狐灵商学 API（backend）

基于 Node.js、Express、MySQL（`hry_*` 表）的 REST 接口服务，为 UniApp 小程序提供登录、个人中心、视频与进度、题库测验等能力。

## 技术栈

- Node.js 18+
- Express 4
- mysql2（连接池）
- bcryptjs（密码哈希）
- jsonwebtoken（JWT）
- dotenv（环境变量）

## 环境准备

1. 安装 [Node.js](https://nodejs.org/)（LTS）。
2. 确保云端 MySQL 可访问，且已创建 `hry_user`、`hry_video`、`hry_progress`、`hry_question`、`hry_quiz_record` 等表。
3. 在本目录复制环境变量文件：

```bash
copy .env.example .env
```

编辑 `.env`，至少配置：

| 变量 | 说明 |
|------|------|
| `PORT` | 服务端口，默认 `3001` |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MySQL 连接信息 |
| `JWT_SECRET` | 足够长的随机字符串，用于签发 token，**勿泄露、勿提交到 Git** |
| `JWT_EXPIRES_IN` | Token 有效期，如 `7d` |

## 安装与启动

```bash
cd backend
npm install
npm start
```

开发时可用文件监听（需 Node 18+）：

```bash
npm run dev
```

启动成功后，默认地址为：`http://localhost:3001`（若修改了 `PORT`，以 `.env` 为准）。

---

## 接口总览

除特别说明外，业务接口成功时一般返回 JSON，且包含 `code: 0`。需登录的接口在请求头中携带 JWT。

| 方法 | 路径 | 是否需要登录 |
|------|------|----------------|
| GET | `/health` | 否 |
| POST | `/api/auth/register` | 否 |
| POST | `/api/auth/login` | 否 |
| GET | `/api/auth/me` | 是 |
| PUT | `/api/user/password` | 是 |
| GET | `/api/videos` | 是 |
| GET | `/api/videos/:id` | 是 |
| GET | `/api/videos/:id/progress` | 是 |
| PUT | `/api/videos/:id/progress` | 是 |
| GET | `/api/videos/:id/questions` | 是（需已按进度看完对应视频） |
| POST | `/api/videos/:id/quiz/submit` | 是（需已按进度看完对应视频） |
| GET | `/api/quiz/wrong` | 是（当前用户错题汇总，数据来自 `hry_quiz_record`） |
| GET | `/api/quiz/wrong/:questionId` | 是（单题详情，须为该用户错题集中的题目） |

### 管理后台（`/api/admin`，与学员端 token 不通用）

需先执行 `npm run seed:admin` 创建 `hry_admin` 表及默认账号 `admin` / `admin123`。管理员 JWT 的 payload 含 `role: 'admin'`，**勿**用于学员端接口。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/login` |  body: `{ username, password }` |
| PUT | `/api/admin/password` | 管理员登录后修改自身密码：`old_password`, `new_password` |
| GET | `/api/admin/stats` | 仪表盘：学员数、视频数、测验记录数、题目数 |
| GET | `/api/admin/stats/charts` | 图表数据：**全部**注册学员与**全部**视频课程的平均得分率；无测验记录时 `avgAccuracy` 为 `null` |
| GET | `/api/admin/questions` | 全部题目题干（含所属课程名、题型；不含选项与答案） |
| GET | `/api/admin/quiz-records` | 全站测验提交记录；query：`limit`（默认 50，最大 200）、`offset` |
| GET | `/api/admin/users` | 学员列表；query：`page`、`pageSize`、`q`（手机号/昵称模糊） |
| GET | `/api/admin/users/:id/learning` | 某学员学情：各课进度、是否算看完、每课最近一次测验得分与正确率 |
| GET | `/api/admin/users/:id/quiz-records` | 某学员测验提交历史；query：`limit`、`offset` |
| PUT | `/api/admin/users/:id` | 编辑：`phone`, `nickname`, `password`（可选） |
| DELETE | `/api/admin/users/:id` | 删除用户及关联 `hry_quiz_record`、`hry_progress` |
| GET | `/api/admin/videos` | 视频列表；query：`page`、`pageSize`、`q`（标题/URL 模糊） |
| GET | `/api/admin/videos/:id/questions` | 某课题库明细（含正确答案，仅管理端） |
| PUT | `/api/admin/videos/:id` | 编辑：`title`, `url`, `sort_order`, `duration_sec`（可为 null） |
| DELETE | `/api/admin/videos/:id` | 删除视频及关联题目、进度、测验记录 |

**鉴权方式**：`Authorization: Bearer <token>`，其中 `<token>` 为 **`POST /api/admin/login`** 返回的 `data.token`。

---

**学员端鉴权方式**：`Authorization: Bearer <token>`，其中 `<token>` 为 **`POST /api/auth/login`** 返回的 `data.token`。

---

## 使用 Postman 测试（详细步骤）

以下步骤适用于 Postman 桌面版；若使用网页版，操作入口名称可能略有差异，但逻辑一致。

### 第一步：创建 Environment（环境）

1. 打开 Postman，点击右上角 **Environments**（环境），或左侧 **Environments**。
2. 点击 **Create Environment**，命名为例如 `狐灵商学-本地`。
3. 添加变量：

| Variable | Initial Value | 说明 |
|----------|---------------|------|
| `baseUrl` | `http://localhost:3001` | 若服务部署在其他机器或端口，改为实际根地址，**不要**末尾加斜杠 |
| `token` | （留空） | 登录成功后把 JWT 填在这里，供后续请求复用 |

4. 保存环境，并在右上角环境下拉框中 **选中** 刚创建的环境，确保请求里能用 `{{baseUrl}}`、`{{token}}`。

### 第二步：验证服务是否存活

1. 新建 **Request**，命名为 `健康检查`。
2. 方法选 **GET**，URL 填：`{{baseUrl}}/health`。
3. 点击 **Send**。
4. 预期：状态码 `200`，Body 类似 `{"ok":true,"service":"huling-academy-api"}`。

若失败，请确认本机已 `npm start`，且端口与 `baseUrl` 一致。

### 第三步：注册用户（可选）

若数据库中已有测试账号，可跳过本步，直接登录。

1. 新建 Request：`注册`。
2. 方法 **POST**，URL：`{{baseUrl}}/api/auth/register`。
3. 打开 **Body**，选 **raw**，右侧类型选 **JSON**，填入例如：

```json
{
  "phone": "13800138000",
  "password": "your_password",
  "nickname": "测试学员"
}
```

4. **Send**。预期：`code` 为 `0`，`data.id` 为新用户主键。若手机号已存在，会返回 `409`。

### 第四步：登录并保存 Token

1. 新建 Request：`登录`。
2. 方法 **POST**，URL：`{{baseUrl}}/api/auth/login`。
3. Body（raw / JSON）例如：

```json
{
  "phone": "13800138000",
  "password": "your_password"
}
```

4. **Send**。在响应 JSON 中找到 `data.token`。
5. 将该字符串复制到环境变量 **`token`** 中保存（或 Postman 的 **Tests** 里用脚本自动写入环境变量，见下文可选脚本）。

之后所有标注「需登录」的请求都要带 Header：`Authorization: Bearer {{token}}`。

**可选：在「登录」请求的 Tests 标签页粘贴脚本，自动写入 `token`：**

```javascript
const json = pm.response.json();
if (json.data && json.data.token) {
  pm.environment.set("token", json.data.token);
}
```

保存后再次 Send，检查环境里 `token` 是否已自动更新。

### 第五步：为需登录接口统一设置 Authorization

有两种做法，任选其一。

**做法 A（推荐）：在 Collection 上统一设置**

1. 新建 **Collection**，例如 `狐灵商学API`。
2. 打开该 Collection 的 **Authorization** 页。
3. Type 选 **Bearer Token**，Token 填 `{{token}}`。
4. 将上述各 Request 都放进该 Collection，子请求默认继承鉴权。

**做法 B：每个请求单独设置**

在每个需登录的 Request 的 **Authorization** 中选 **Bearer Token**，Token 填 `{{token}}`。

### 第六步：依次测试业务接口

以下 URL 均使用 `{{baseUrl}}` 前缀，且需登录的请求已按上一步带好 **Bearer {{token}}**。

#### 1. 当前用户 `GET /api/auth/me`

- 方法：GET  
- URL：`{{baseUrl}}/api/auth/me`  
- 预期：`code` 为 `0`，`data` 含 `id`、`phone`、`nickname` 等。

#### 2. 修改密码 `PUT /api/user/password`

- 方法：PUT  
- URL：`{{baseUrl}}/api/user/password`  
- Body（JSON）：

```json
{
  "old_password": "your_password",
  "new_password": "new_password_123"
}
```

- 预期：`code` 为 `0`。之后登录需使用新密码；若改了密码，请重新执行「登录」以刷新 `token`（旧 token 仍可能有效至过期，以 JWT 配置为准）。

#### 3. 视频列表 `GET /api/videos`

- 方法：GET  
- URL：`{{baseUrl}}/api/videos`  
- 预期：`data` 为数组，元素含 `id`、`title`、`url`、`sort_order` 等。

#### 4. 单个视频 `GET /api/videos/:id`

- 方法：GET  
- URL 示例：`{{baseUrl}}/api/videos/1`（将 `1` 换成实际 `hry_video.id`）。

#### 5. 查询学习进度 `GET /api/videos/:id/progress`

- 方法：GET  
- URL 示例：`{{baseUrl}}/api/videos/1/progress`  
- 预期：`data.position_sec` 为已保存的秒数，无记录时为 `0`。

#### 6. 上报学习进度 `PUT /api/videos/:id/progress`

- 方法：PUT  
- URL 示例：`{{baseUrl}}/api/videos/1/progress`  
- Body（JSON）：

```json
{
  "position_sec": 120
}
```

- 表示播放到第 120 秒。预期：`data.position_sec` 与提交一致。

#### 7. 获取题目（无答案与解析）`GET /api/videos/:id/questions`

- 方法：GET  
- URL 示例：`{{baseUrl}}/api/videos/1/questions`  
- 预期：`data` 为题干与选项；不含 `correct_answer`、`analysis`。若该课无题目，返回空数组。  
- **前提**：学习进度需满足「已看完视频」规则（与提交测验一致），否则 `403`。

#### 8. 错题汇总 `GET /api/quiz/wrong`

- 方法：GET  
- URL：`{{baseUrl}}/api/quiz/wrong`  
- 说明：解析当前用户所有 `hry_quiz_record.detail_json` 中 `is_correct: false` 的题目，去重后关联 `hry_question` / `hry_video` 返回题干、解析、所属课程等。

#### 9. 错题单题 `GET /api/quiz/wrong/:questionId`

- 方法：GET  
- URL 示例：`{{baseUrl}}/api/quiz/wrong/12`（`12` 为 `hry_question.id`）  
- 说明：返回结构与列表中单项一致；若该题不在当前用户错题集中则 `404`。

#### 10. 提交测验 `POST /api/videos/:id/quiz/submit`

- 方法：POST  
- URL 示例：`{{baseUrl}}/api/videos/1/quiz/submit`  
- Body（JSON）中 `question_id` 须与 `hry_question.id` 一致，`user_answer` 格式需与题库中 `correct_answer` 的 JSON 规则一致（单选可为字符串或单元素数组，多选为数组，判断为布尔或约定值）：

```json
{
  "answers": [
    { "question_id": 1, "user_answer": "A" },
    { "question_id": 2, "user_answer": ["A", "C"] },
    { "question_id": 3, "user_answer": true }
  ]
}
```

- 预期：`data` 含 `score`、`total`、`correct`、`details`（含每题是否正确、正确答案、解析）。同时会向 `hry_quiz_record` 插入一条记录。

---

## 建议的 Postman 测试顺序

1. `GET /health`  
2. `POST /api/auth/register`（或使用已有账号跳过）  
3. `POST /api/auth/login`，并设置好 `token`  
4. `GET /api/auth/me`  
5. `GET /api/videos`  
6. `GET /api/videos/1`  
7. `PUT /api/videos/1/progress` → `GET /api/videos/1/progress`  
8. `GET /api/videos/1/questions`（需库中已有 `hry_question` 数据）  
9. `POST /api/videos/1/quiz/submit`  
10. `PUT /api/user/password`（可选，放在最后以免中途改密导致混淆）

---

## 常见问题

- **401 未登录**：检查是否选中 Environment、`token` 是否已填、Header 是否为 `Authorization: Bearer {{token}}`（注意 `Bearer` 后有一个空格）。  
- **连接数据库失败**：检查 `.env` 中 MySQL 地址、账号、防火墙与白名单。  
- **测验返回「该课程暂无题目」**：该 `video_id` 在 `hry_question` 中无数据，需在库中插入题目。  
- **小程序正式环境**：微信要求请求 **HTTPS** 域名，并在公众平台配置 **request 合法域名**；请勿把数据库密码、JWT 密钥写进前端代码。

---

## 许可证

本项目为课程/实训使用，按团队或教师要求使用即可。

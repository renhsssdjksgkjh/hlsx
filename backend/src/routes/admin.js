const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');
const { adminAuth } = require('../middleware/adminAuth');
const { parseJson } = require('../utils/json');

const router = express.Router();
const pool = getPool();

/** 与学员端 assertUserWatchedVideo 一致，用于管理端展示「是否算看完」 */
const NO_DURATION_MIN_SEC = 30;
const END_TOLERANCE_SEC = 3;

function finishedWatching(positionSec, durationSec) {
  const pos = Number(positionSec) || 0;
  const dur = Number(durationSec) || 0;
  if (dur > 0) return pos >= dur - END_TOLERANCE_SEC;
  return pos >= NO_DURATION_MIN_SEC;
}

function adminToken(adminRow) {
  return jwt.sign(
    { aid: adminRow.id, username: adminRow.username, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/** POST /api/admin/login */
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ code: 400, message: '缺少账号或密码' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT id, username, password_hash FROM hry_admin WHERE username = ? LIMIT 1',
      [String(username).trim()]
    );
    const a = rows[0];
    if (!a || !(await bcrypt.compare(password, a.password_hash))) {
      return res.status(401).json({ code: 401, message: '账号或密码错误' });
    }
    return res.json({
      code: 0,
      message: 'ok',
      data: { token: adminToken(a), admin: { id: a.id, username: a.username } },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ code: 500, message: '登录服务异常' });
  }
});

router.use(adminAuth);

/** GET /api/admin/stats 仪表盘汇总 */
router.get('/stats', async (_req, res) => {
  const [[u]] = await pool.query('SELECT COUNT(*) AS c FROM hry_user');
  const [[v]] = await pool.query('SELECT COUNT(*) AS c FROM hry_video');
  const [[q]] = await pool.query('SELECT COUNT(*) AS c FROM hry_quiz_record');
  const [[n]] = await pool.query('SELECT COUNT(*) AS c FROM hry_question');
  return res.json({
    code: 0,
    data: {
      userCount: Number(u.c) || 0,
      videoCount: Number(v.c) || 0,
      quizRecordCount: Number(q.c) || 0,
      questionCount: Number(n.c) || 0,
    },
  });
});

/** GET /api/admin/stats/charts 仪表盘图表：全部学员 / 全部课程的平均得分率（无测验则为 null） */
router.get('/stats/charts', async (_req, res) => {
  const [userRows] = await pool.query(
    `SELECT u.id AS user_id,
            COALESCE(NULLIF(TRIM(u.nickname), ''), u.phone) AS label,
            AVG(r.score / NULLIF(r.total, 0)) AS avg_accuracy,
            COUNT(r.id) AS quiz_count
     FROM hry_user u
     LEFT JOIN hry_quiz_record r ON r.user_id = u.id
     GROUP BY u.id, u.phone, u.nickname
     ORDER BY u.id ASC`
  );
  const [videoRows] = await pool.query(
    `SELECT v.id AS video_id,
            v.title AS video_title,
            v.sort_order,
            AVG(r.score / NULLIF(r.total, 0)) AS avg_accuracy,
            COUNT(r.id) AS attempt_count
     FROM hry_video v
     LEFT JOIN hry_quiz_record r ON r.video_id = v.id
     GROUP BY v.id, v.title, v.sort_order
     ORDER BY v.sort_order ASC, v.id ASC`
  );

  const userQuizAvg = userRows.map((row) => ({
    user_id: row.user_id,
    label: String(row.label || ''),
    avgAccuracy:
      row.avg_accuracy != null && row.avg_accuracy !== undefined
        ? Number(row.avg_accuracy)
        : null,
    quizCount: Number(row.quiz_count) || 0,
  }));
  const videoQuizAvg = videoRows.map((row) => ({
    video_id: row.video_id,
    video_title: String(row.video_title || ''),
    avgAccuracy:
      row.avg_accuracy != null && row.avg_accuracy !== undefined
        ? Number(row.avg_accuracy)
        : null,
    attemptCount: Number(row.attempt_count) || 0,
  }));

  return res.json({ code: 0, data: { userQuizAvg, videoQuizAvg } });
});

/** GET /api/admin/questions 全部题目题干（不含选项与答案，仅管理端；分页） */
router.get('/questions', async (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 10));
  const offset = Math.max(0, Number(req.query.offset) || 0);

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM hry_question q
     INNER JOIN hry_video v ON v.id = q.video_id`
  );

  const [rows] = await pool.query(
    `SELECT q.id, q.video_id, v.title AS video_title, q.type, q.content, q.sort_order
     FROM hry_question q
     INNER JOIN hry_video v ON v.id = q.video_id
     ORDER BY v.sort_order ASC, v.id ASC, q.sort_order ASC, q.id ASC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  return res.json({
    code: 0,
    data: {
      list: rows,
      total: Number(countRow.total) || 0,
      limit,
      offset,
    },
  });
});

/** GET /api/admin/quiz-records 全站测验提交记录（学员 + 课程） */
router.get('/quiz-records', async (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const offset = Math.max(0, Number(req.query.offset) || 0);

  const [rows] = await pool.query(
    `SELECT r.id, r.user_id,
            COALESCE(NULLIF(TRIM(u.nickname), ''), u.phone) AS user_label,
            u.phone,
            r.video_id, v.title AS video_title,
            r.score, r.total, r.created_at
     FROM hry_quiz_record r
     INNER JOIN hry_user u ON u.id = r.user_id
     INNER JOIN hry_video v ON v.id = r.video_id
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  const [[countRow]] = await pool.query('SELECT COUNT(*) AS total FROM hry_quiz_record');

  const list = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    user_label: String(row.user_label || ''),
    phone: row.phone,
    video_id: row.video_id,
    video_title: String(row.video_title || ''),
    score: Number(row.score) || 0,
    total: Number(row.total) || 0,
    created_at: row.created_at,
  }));

  return res.json({
    code: 0,
    data: {
      list,
      total: Number(countRow.total) || 0,
      limit,
      offset,
    },
  });
});

/** PUT /api/admin/password */
router.put('/password', async (req, res) => {
  const { old_password: oldPassword, new_password: newPassword } = req.body || {};
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ code: 400, message: '请填写旧密码与新密码' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ code: 400, message: '新密码至少 6 位' });
  }
  const [rows] = await pool.query(
    'SELECT id, password_hash FROM hry_admin WHERE id = ? LIMIT 1',
    [req.admin.id]
  );
  const a = rows[0];
  if (!a || !(await bcrypt.compare(oldPassword, a.password_hash))) {
    return res.status(401).json({ code: 401, message: '旧密码错误' });
  }
  const hash = await bcrypt.hash(String(newPassword), 10);
  await pool.query('UPDATE hry_admin SET password_hash = ?, updated_at = NOW() WHERE id = ?', [
    hash,
    req.admin.id,
  ]);
  return res.json({ code: 0, message: '密码已更新' });
});

/** GET /api/admin/users 支持 q（手机号/昵称模糊）、page、pageSize */
router.get('/users', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const q = req.query.q != null && String(req.query.q).trim() !== '' ? String(req.query.q).trim() : '';

  let whereSql = '';
  const params = [];
  if (q) {
    whereSql = ' WHERE phone LIKE ? OR IFNULL(nickname, "") LIKE ?';
    const like = `%${q}%`;
    params.push(like, like);
  }

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total FROM hry_user${whereSql}`,
    params
  );
  const offset = (page - 1) * pageSize;
  const [list] = await pool.query(
    `SELECT id, phone, nickname, created_at, updated_at FROM hry_user${whereSql} ORDER BY id ASC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return res.json({
    code: 0,
    data: {
      list,
      total: Number(countRow.total) || 0,
      page,
      pageSize,
    },
  });
});

/** GET /api/admin/users/:id/learning 学情汇总（各课进度 + 每课最近一次测验得分） */
router.get('/users/:id/learning', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ code: 400, message: '无效的用户 ID' });
  }
  const [exist] = await pool.query('SELECT id FROM hry_user WHERE id = ?', [id]);
  if (!exist.length) {
    return res.status(404).json({ code: 404, message: '用户不存在' });
  }

  const [videos] = await pool.query(
    `SELECT v.id AS video_id, v.title, v.sort_order, v.duration_sec,
            COALESCE(p.position_sec, 0) AS position_sec
     FROM hry_video v
     LEFT JOIN hry_progress p ON p.video_id = v.id AND p.user_id = ?
     ORDER BY v.sort_order ASC, v.id ASC`,
    [id]
  );

  const [latestQuizzes] = await pool.query(
    `SELECT r.video_id, r.score, r.total, r.created_at
     FROM hry_quiz_record r
     INNER JOIN (
       SELECT video_id, MAX(id) AS max_id
       FROM hry_quiz_record
       WHERE user_id = ?
       GROUP BY video_id
     ) t ON r.video_id = t.video_id AND r.id = t.max_id`,
    [id]
  );
  const quizByVideo = Object.fromEntries(
    latestQuizzes.map((row) => [
      row.video_id,
      {
        score: Number(row.score) || 0,
        total: Number(row.total) || 0,
        created_at: row.created_at,
        accuracy:
          Number(row.total) > 0 ? Number(row.score) / Number(row.total) : null,
      },
    ])
  );

  const list = videos.map((row) => {
    const dur = row.duration_sec != null ? Number(row.duration_sec) : null;
    const pos = Number(row.position_sec) || 0;
    let progress_percent = null;
    if (dur != null && dur > 0) {
      progress_percent = Math.min(100, Math.round((pos / dur) * 10000) / 100);
    }
    const latest_quiz = quizByVideo[row.video_id] || null;
    return {
      video_id: row.video_id,
      title: row.title,
      sort_order: row.sort_order,
      duration_sec: dur,
      position_sec: pos,
      progress_percent,
      finished_watching: finishedWatching(pos, dur ?? 0),
      latest_quiz,
    };
  });

  return res.json({ code: 0, data: { videos: list } });
});

/** GET /api/admin/users/:id/quiz-records 测验提交历史（支持 limit/offset） */
router.get('/users/:id/quiz-records', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ code: 400, message: '无效的用户 ID' });
  }
  const [exist] = await pool.query('SELECT id FROM hry_user WHERE id = ?', [id]);
  if (!exist.length) {
    return res.status(404).json({ code: 404, message: '用户不存在' });
  }

  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
  const offset = Math.max(0, Number(req.query.offset) || 0);

  const [rows] = await pool.query(
    `SELECT r.id, r.video_id, v.title AS video_title, r.score, r.total, r.created_at
     FROM hry_quiz_record r
     JOIN hry_video v ON v.id = r.video_id
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT ? OFFSET ?`,
    [id, limit, offset]
  );

  const [[countRow]] = await pool.query(
    'SELECT COUNT(*) AS total FROM hry_quiz_record WHERE user_id = ?',
    [id]
  );

  const list = rows.map((row) => ({
    id: row.id,
    video_id: row.video_id,
    video_title: row.video_title,
    score: Number(row.score) || 0,
    total: Number(row.total) || 0,
    accuracy: Number(row.total) > 0 ? Number(row.score) / Number(row.total) : null,
    created_at: row.created_at,
  }));

  return res.json({
    code: 0,
    data: {
      list,
      total: Number(countRow.total) || 0,
      limit,
      offset,
    },
  });
});

/** PUT /api/admin/users/:id */
router.put('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ code: 400, message: '无效的用户 ID' });
  }
  const { phone, nickname, password } = req.body || {};
  const [exist] = await pool.query('SELECT id FROM hry_user WHERE id = ?', [id]);
  if (!exist.length) {
    return res.status(404).json({ code: 404, message: '用户不存在' });
  }
  if (phone !== undefined) {
    const p = String(phone).trim();
    if (!p) return res.status(400).json({ code: 400, message: '手机号不能为空' });
    const [dup] = await pool.query('SELECT id FROM hry_user WHERE phone = ? AND id != ?', [p, id]);
    if (dup.length) {
      return res.status(409).json({ code: 409, message: '该手机号已被占用' });
    }
  }
  const fields = [];
  const vals = [];
  if (phone !== undefined) {
    fields.push('phone = ?');
    vals.push(String(phone).trim());
  }
  if (nickname !== undefined) {
    fields.push('nickname = ?');
    vals.push(nickname === null || nickname === '' ? null : String(nickname));
  }
  if (password !== undefined && String(password).length > 0) {
    if (String(password).length < 6) {
      return res.status(400).json({ code: 400, message: '密码至少 6 位' });
    }
    fields.push('password_hash = ?');
    vals.push(await bcrypt.hash(String(password), 10));
  }
  if (!fields.length) {
    return res.status(400).json({ code: 400, message: '没有要更新的字段' });
  }
  fields.push('updated_at = NOW()');
  vals.push(id);
  await pool.query(`UPDATE hry_user SET ${fields.join(', ')} WHERE id = ?`, vals);
  const [rows] = await pool.query(
    'SELECT id, phone, nickname, created_at, updated_at FROM hry_user WHERE id = ?',
    [id]
  );
  return res.json({ code: 0, data: rows[0] });
});

/** DELETE /api/admin/users/:id */
router.delete('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ code: 400, message: '无效的用户 ID' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM hry_quiz_record WHERE user_id = ?', [id]);
    await conn.query('DELETE FROM hry_progress WHERE user_id = ?', [id]);
    const [r] = await conn.query('DELETE FROM hry_user WHERE id = ?', [id]);
    if (r.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }
    await conn.commit();
    return res.json({ code: 0, message: '已删除' });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    return res.status(500).json({ code: 500, message: '删除失败，可能存在关联数据' });
  } finally {
    conn.release();
  }
});

/** GET /api/admin/videos 支持 q（标题/URL 模糊）、page、pageSize */
router.get('/videos', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const q = req.query.q != null && String(req.query.q).trim() !== '' ? String(req.query.q).trim() : '';

  let whereSql = '';
  const params = [];
  if (q) {
    whereSql = ' WHERE title LIKE ? OR url LIKE ?';
    const like = `%${q}%`;
    params.push(like, like);
  }

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total FROM hry_video${whereSql}`,
    params
  );
  const offset = (page - 1) * pageSize;
  const [list] = await pool.query(
    `SELECT id, title, url, sort_order, duration_sec, created_at FROM hry_video${whereSql} ORDER BY sort_order ASC, id ASC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return res.json({
    code: 0,
    data: {
      list,
      total: Number(countRow.total) || 0,
      page,
      pageSize,
    },
  });
});

/** GET /api/admin/videos/:id/questions 题库明细（含答案，仅管理端） */
router.get('/videos/:id/questions', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ code: 400, message: '无效的视频 ID' });
  }
  const [exist] = await pool.query('SELECT id FROM hry_video WHERE id = ?', [id]);
  if (!exist.length) {
    return res.status(404).json({ code: 404, message: '视频不存在' });
  }
  const [qs] = await pool.query(
    `SELECT id, video_id, type, content, options, correct_answer, analysis, sort_order
     FROM hry_question WHERE video_id = ? ORDER BY sort_order ASC, id ASC`,
    [id]
  );
  const data = qs.map((row) => ({
    id: row.id,
    video_id: row.video_id,
    type: row.type,
    content: row.content,
    options: parseJson(row.options),
    correct_answer: parseJson(row.correct_answer),
    analysis: row.analysis,
    sort_order: row.sort_order,
  }));
  return res.json({ code: 0, data });
});

/** PUT /api/admin/videos/:id */
router.put('/videos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ code: 400, message: '无效的视频 ID' });
  }
  const { title, url, sort_order: sortOrder, duration_sec: durationSec } = req.body || {};
  const [exist] = await pool.query('SELECT id FROM hry_video WHERE id = ?', [id]);
  if (!exist.length) {
    return res.status(404).json({ code: 404, message: '视频不存在' });
  }
  const fields = [];
  const vals = [];
  if (title !== undefined) {
    fields.push('title = ?');
    vals.push(String(title));
  }
  if (url !== undefined) {
    fields.push('url = ?');
    vals.push(String(url));
  }
  if (sortOrder !== undefined) {
    const n = Number(sortOrder);
    if (!Number.isFinite(n)) {
      return res.status(400).json({ code: 400, message: 'sort_order 无效' });
    }
    fields.push('sort_order = ?');
    vals.push(Math.floor(n));
  }
  if (durationSec !== undefined) {
    if (durationSec === null) {
      fields.push('duration_sec = NULL');
    } else {
      const n = Number(durationSec);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ code: 400, message: 'duration_sec 无效' });
      }
      fields.push('duration_sec = ?');
      vals.push(Math.floor(n));
    }
  }
  if (!fields.length) {
    return res.status(400).json({ code: 400, message: '没有要更新的字段' });
  }
  vals.push(id);
  await pool.query(`UPDATE hry_video SET ${fields.join(', ')} WHERE id = ?`, vals);
  const [rows] = await pool.query(
    'SELECT id, title, url, sort_order, duration_sec, created_at FROM hry_video WHERE id = ?',
    [id]
  );
  return res.json({ code: 0, data: rows[0] });
});

/** DELETE /api/admin/videos/:id */
router.delete('/videos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ code: 400, message: '无效的视频 ID' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM hry_question WHERE video_id = ?', [id]);
    await conn.query('DELETE FROM hry_progress WHERE video_id = ?', [id]);
    await conn.query('DELETE FROM hry_quiz_record WHERE video_id = ?', [id]);
    const [r] = await conn.query('DELETE FROM hry_video WHERE id = ?', [id]);
    if (r.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ code: 404, message: '视频不存在' });
    }
    await conn.commit();
    return res.json({ code: 0, message: '已删除' });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    return res.status(500).json({ code: 500, message: '删除失败' });
  } finally {
    conn.release();
  }
});

/** ---------- 群公告 hry_notice ---------- */

async function replaceNoticeUsers(conn, noticeId, targetType, userIds) {
  await conn.query('DELETE FROM hry_notice_user WHERE notice_id = ?', [noticeId]);
  if (targetType !== 'selected' || !Array.isArray(userIds) || userIds.length === 0) {
    return;
  }
  const ids = [...new Set(userIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))];
  for (const uid of ids) {
    await conn.query('INSERT INTO hry_notice_user (notice_id, user_id) VALUES (?, ?)', [noticeId, uid]);
  }
}

/** GET /api/admin/notices 分页 */
router.get('/notices', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const [[countRow]] = await pool.query('SELECT COUNT(*) AS total FROM hry_notice');
  const [rows] = await pool.query(
    `SELECT n.id, n.title, n.body, n.created_at, n.published_at, n.target_type, n.admin_id,
            a.username AS admin_username
     FROM hry_notice n
     INNER JOIN hry_admin a ON a.id = n.admin_id
     ORDER BY n.created_at DESC, n.id DESC
     LIMIT ? OFFSET ?`,
    [pageSize, offset]
  );

  return res.json({
    code: 0,
    data: {
      list: rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        created_at: r.created_at,
        published_at: r.published_at,
        target_type: r.target_type,
        admin_id: r.admin_id,
        admin_username: r.admin_username,
      })),
      total: Number(countRow.total) || 0,
      page,
      pageSize,
    },
  });
});

/** GET /api/admin/notices/:id 单条（含 user_ids） */
router.get('/notices/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ code: 400, message: '无效的公告 ID' });
  }
  const [rows] = await pool.query(
    `SELECT n.id, n.title, n.body, n.created_at, n.published_at, n.target_type, n.admin_id,
            a.username AS admin_username
     FROM hry_notice n
     INNER JOIN hry_admin a ON a.id = n.admin_id
     WHERE n.id = ?`,
    [id]
  );
  if (!rows.length) {
    return res.status(404).json({ code: 404, message: '公告不存在' });
  }
  const [urows] = await pool.query(
    'SELECT user_id FROM hry_notice_user WHERE notice_id = ? ORDER BY user_id ASC',
    [id]
  );
  const row = rows[0];
  return res.json({
    code: 0,
    data: {
      id: row.id,
      title: row.title,
      body: row.body,
      created_at: row.created_at,
      published_at: row.published_at,
      target_type: row.target_type,
      admin_id: row.admin_id,
      admin_username: row.admin_username,
      user_ids: urows.map((u) => u.user_id),
    },
  });
});

/** POST /api/admin/notices */
router.post('/notices', async (req, res) => {
  const { title, body, target_type: targetType, user_ids: userIds, publish } = req.body || {};
  const t = title != null ? String(title).trim() : '';
  const b = body != null ? String(body).trim() : '';
  if (!t || !b) {
    return res.status(400).json({ code: 400, message: '请填写标题与正文' });
  }
  const tt = targetType === 'selected' ? 'selected' : 'all';
  if (tt === 'selected' && (!Array.isArray(userIds) || userIds.length === 0)) {
    return res.status(400).json({ code: 400, message: '指定用户时请至少选择一名学员' });
  }
  const pub = Boolean(publish);
  const adminId = req.admin.id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const publishedAt = pub ? new Date() : null;
    const [ins] = await conn.query(
      `INSERT INTO hry_notice (title, body, published_at, admin_id, target_type)
       VALUES (?, ?, ?, ?, ?)`,
      [t, b, publishedAt, adminId, tt]
    );
    const noticeId = ins.insertId;
    await replaceNoticeUsers(conn, noticeId, tt, userIds || []);
    await conn.commit();
    const [rows] = await pool.query(
      `SELECT n.id, n.title, n.body, n.created_at, n.published_at, n.target_type, n.admin_id
       FROM hry_notice n WHERE n.id = ?`,
      [noticeId]
    );
    const [urows] = await pool.query('SELECT user_id FROM hry_notice_user WHERE notice_id = ?', [noticeId]);
    return res.json({
      code: 0,
      data: {
        ...rows[0],
        user_ids: urows.map((x) => x.user_id),
      },
    });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    return res.status(500).json({ code: 500, message: '创建失败' });
  } finally {
    conn.release();
  }
});

/** PUT /api/admin/notices/:id */
router.put('/notices/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ code: 400, message: '无效的公告 ID' });
  }
  const { title, body, target_type: targetType, user_ids: userIds, publish } = req.body || {};
  const t = title != null ? String(title).trim() : '';
  const b = body != null ? String(body).trim() : '';
  if (!t || !b) {
    return res.status(400).json({ code: 400, message: '请填写标题与正文' });
  }
  const tt = targetType === 'selected' ? 'selected' : 'all';
  if (tt === 'selected' && (!Array.isArray(userIds) || userIds.length === 0)) {
    return res.status(400).json({ code: 400, message: '指定用户时请至少选择一名学员' });
  }
  const pub = Boolean(publish);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [exist] = await conn.query('SELECT id FROM hry_notice WHERE id = ?', [id]);
    if (!exist.length) {
      await conn.rollback();
      return res.status(404).json({ code: 404, message: '公告不存在' });
    }
    const publishedAt = pub ? new Date() : null;
    await conn.query(
      `UPDATE hry_notice SET title = ?, body = ?, published_at = ?, target_type = ? WHERE id = ?`,
      [t, b, publishedAt, tt, id]
    );
    await replaceNoticeUsers(conn, id, tt, userIds || []);
    await conn.commit();
    const [rows] = await pool.query(
      `SELECT n.id, n.title, n.body, n.created_at, n.published_at, n.target_type, n.admin_id
       FROM hry_notice n WHERE n.id = ?`,
      [id]
    );
    const [urows] = await pool.query('SELECT user_id FROM hry_notice_user WHERE notice_id = ?', [id]);
    return res.json({
      code: 0,
      data: {
        ...rows[0],
        user_ids: urows.map((x) => x.user_id),
      },
    });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    return res.status(500).json({ code: 500, message: '更新失败' });
  } finally {
    conn.release();
  }
});

/** DELETE /api/admin/notices/:id */
router.delete('/notices/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ code: 400, message: '无效的公告 ID' });
  }
  const [r] = await pool.query('DELETE FROM hry_notice WHERE id = ?', [id]);
  if (r.affectedRows === 0) {
    return res.status(404).json({ code: 404, message: '公告不存在' });
  }
  return res.json({ code: 0, message: '已删除' });
});

/** POST /api/admin/notices/:id/publish 仅发布（不改变正文） */
router.post('/notices/:id/publish', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ code: 400, message: '无效的公告 ID' });
  }
  const [r] = await pool.query('UPDATE hry_notice SET published_at = NOW() WHERE id = ?', [id]);
  if (r.affectedRows === 0) {
    return res.status(404).json({ code: 404, message: '公告不存在' });
  }
  const [rows] = await pool.query(
    'SELECT id, title, body, created_at, published_at, target_type, admin_id FROM hry_notice WHERE id = ?',
    [id]
  );
  return res.json({ code: 0, data: rows[0] });
});

module.exports = router;

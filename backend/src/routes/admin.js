const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');
const { adminAuth } = require('../middleware/adminAuth');

const router = express.Router();
const pool = getPool();

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

/** GET /api/admin/users */
router.get('/users', async (req, res) => {
  const [list] = await pool.query(
    'SELECT id, phone, nickname, created_at, updated_at FROM hry_user ORDER BY id ASC'
  );
  return res.json({ code: 0, data: list });
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

/** GET /api/admin/videos */
router.get('/videos', async (req, res) => {
  const [list] = await pool.query(
    'SELECT id, title, url, sort_order, duration_sec, created_at FROM hry_video ORDER BY sort_order ASC, id ASC'
  );
  return res.json({ code: 0, data: list });
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

module.exports = router;

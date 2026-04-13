const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
const pool = getPool();

router.post('/register', async (req, res) => {
  const { phone, password, nickname } = req.body || {};
  if (!phone || !password) {
    return res.status(400).json({ code: 400, message: '缺少手机号或密码' });
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    const [r] = await pool.query(
      'INSERT INTO hry_user (phone, password_hash, nickname) VALUES (?, ?, ?)',
      [phone, hash, nickname || null]
    );
    return res.json({ code: 0, message: 'ok', data: { id: r.insertId } });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ code: 409, message: '手机号已注册' });
    }
    console.error(e);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

router.post('/login', async (req, res) => {
  const { phone, password } = req.body || {};
  if (!phone || !password) {
    return res.status(400).json({ code: 400, message: '缺少手机号或密码' });
  }
  const [rows] = await pool.query(
    'SELECT id, phone, password_hash FROM hry_user WHERE phone = ? LIMIT 1',
    [phone]
  );
  const u = rows[0];
  if (!u || !(await bcrypt.compare(password, u.password_hash))) {
    return res.status(401).json({ code: 401, message: '手机号或密码错误' });
  }
  const token = jwt.sign(
    { uid: Number(u.id), phone: u.phone },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  return res.json({
    code: 0,
    message: 'ok',
    data: {
      token,
      user: { id: u.id, phone: u.phone },
    },
  });
});

router.get('/me', authRequired, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, phone, nickname, created_at, updated_at FROM hry_user WHERE id = ?',
    [req.user.id]
  );
  return res.json({ code: 0, data: rows[0] || null });
});

module.exports = router;

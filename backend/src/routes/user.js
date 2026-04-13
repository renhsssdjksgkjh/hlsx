const express = require('express');
const bcrypt = require('bcryptjs');
const { getPool } = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
const pool = getPool();

router.put('/password', authRequired, async (req, res) => {
  const { old_password, new_password } = req.body || {};
  if (!old_password || !new_password) {
    return res.status(400).json({ code: 400, message: '缺少旧密码或新密码' });
  }
  if (String(new_password).length < 6) {
    return res.status(400).json({ code: 400, message: '新密码至少 6 位' });
  }
  const [rows] = await pool.query(
    'SELECT password_hash FROM hry_user WHERE id = ?',
    [req.user.id]
  );
  const u = rows[0];
  if (!u || !(await bcrypt.compare(old_password, u.password_hash))) {
    return res.status(400).json({ code: 400, message: '旧密码错误' });
  }
  const hash = await bcrypt.hash(new_password, 10);
  await pool.query(
    'UPDATE hry_user SET password_hash = ?, updated_at = NOW() WHERE id = ?',
    [hash, req.user.id]
  );
  return res.json({ code: 0, message: '密码已更新' });
});

module.exports = router;

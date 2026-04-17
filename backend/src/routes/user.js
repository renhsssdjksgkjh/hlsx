const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { getPool } = require('../config/db');
const { authRequired } = require('../middleware/auth');
const { fetchWrongListForUser } = require('../services/wrongList');
const { END_TOLERANCE_SEC, NO_DURATION_MIN_SEC } = require('../utils/videoWatch');

const router = express.Router();
const pool = getPool();

/** GET /api/user/stats 学习概览（课程完成数、测验次数、错题数、最近测验） */
router.get('/stats', authRequired, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const [[totalRow]] = await pool.query('SELECT COUNT(*) AS c FROM hry_video');
    const [[completedRow]] = await pool.query(
      `SELECT COUNT(*) AS c
       FROM hry_video v
       INNER JOIN hry_progress p ON p.video_id = v.id AND p.user_id = ?
       WHERE (COALESCE(v.duration_sec, 0) > 0 AND p.position_sec >= COALESCE(v.duration_sec, 0) - ?)
          OR (COALESCE(v.duration_sec, 0) = 0 AND p.position_sec >= ?)`,
      [uid, END_TOLERANCE_SEC, NO_DURATION_MIN_SEC]
    );
    const [[attemptsRow]] = await pool.query(
      'SELECT COUNT(*) AS c FROM hry_quiz_record WHERE user_id = ?',
      [uid]
    );
    const [lastRows] = await pool.query(
      `SELECT v.title AS video_title, r.score, r.total, r.created_at
       FROM hry_quiz_record r
       INNER JOIN hry_video v ON v.id = r.video_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT 1`,
      [uid]
    );
    const wrongList = await fetchWrongListForUser(uid);
    const last = lastRows[0];
    return res.json({
      code: 0,
      data: {
        course_total: Number(totalRow.c) || 0,
        course_completed: Number(completedRow.c) || 0,
        quiz_attempts: Number(attemptsRow.c) || 0,
        wrong_count: wrongList.length,
        last_quiz: last
          ? {
              video_title: last.video_title,
              score: Number(last.score) || 0,
              total: Number(last.total) || 0,
              created_at: last.created_at,
            }
          : null,
      },
    });
  } catch (e) {
    return next(e);
  }
});

const avatarsDir = path.join(__dirname, '../../uploads/avatars');
fs.mkdirSync(avatarsDir, { recursive: true });

function extFromMimetype(mime) {
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/gif') return '.gif';
  if (mime === 'image/webp') return '.webp';
  return '.jpg';
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const ext = extFromMimetype(file.mimetype);
    cb(null, `${req.user.id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|gif|webp)$/.test(file.mimetype);
    cb(ok ? null : new Error('仅支持 JPG/PNG/GIF/WebP'), ok);
  },
});

router.put('/profile', authRequired, async (req, res, next) => {
  try {
    const { nickname, signature } = req.body || {};
    const sets = [];
    const vals = [];
    if (nickname !== undefined) {
      const n = String(nickname).trim();
      if (n.length > 64) {
        return res.status(400).json({ code: 400, message: '昵称不能超过 64 字' });
      }
      sets.push('nickname = ?');
      vals.push(n === '' ? null : n);
    }
    if (signature !== undefined) {
      const s = String(signature).trim();
      if (s.length > 255) {
        return res.status(400).json({ code: 400, message: '签名不能超过 255 字' });
      }
      sets.push('signature = ?');
      vals.push(s === '' ? null : s);
    }
    if (sets.length === 0) {
      return res.status(400).json({ code: 400, message: '没有要更新的内容' });
    }
    sets.push('updated_at = NOW()');
    vals.push(req.user.id);
    await pool.query(`UPDATE hry_user SET ${sets.join(', ')} WHERE id = ?`, vals);
    const [rows] = await pool.query(
      'SELECT id, phone, nickname, signature, avatar_url, created_at, updated_at FROM hry_user WHERE id = ?',
      [req.user.id]
    );
    return res.json({ code: 0, data: rows[0] });
  } catch (e) {
    return next(e);
  }
});

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

router.post('/avatar', authRequired, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ code: 400, message: '图片不能超过 2MB' });
      }
      if (err.message === '仅支持 JPG/PNG/GIF/WebP') {
        return res.status(400).json({ code: 400, message: err.message });
      }
      return next(err);
    }
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请选择图片文件' });
    }
    (async () => {
      try {
        const rel = `/uploads/avatars/${req.file.filename}`;
        await pool.query(
          'UPDATE hry_user SET avatar_url = ?, updated_at = NOW() WHERE id = ?',
          [rel, req.user.id]
        );
        return res.json({ code: 0, data: { avatar_url: rel } });
      } catch (e) {
        return next(e);
      }
    })();
  });
});

/** GET /api/user/notices 当前用户可见的已发布公告（列表不含正文） */
router.get('/notices', authRequired, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const [rows] = await pool.query(
      `SELECT n.id, n.title, n.created_at
       FROM hry_notice n
       WHERE n.published_at IS NOT NULL
         AND (
           n.target_type = 'all'
           OR EXISTS (
             SELECT 1 FROM hry_notice_user nu
             WHERE nu.notice_id = n.id AND nu.user_id = ?
           )
         )
       ORDER BY n.published_at DESC, n.id DESC`,
      [uid]
    );
    return res.json({
      code: 0,
      data: {
        list: rows.map((r) => ({
          id: r.id,
          title: r.title,
          created_at: r.created_at,
        })),
      },
    });
  } catch (e) {
    return next(e);
  }
});

/** GET /api/user/notices/:id 详情（含正文，校验可见性） */
router.get('/notices/:id', authRequired, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ code: 400, message: '无效的公告 ID' });
    }
    const [rows] = await pool.query(
      `SELECT n.id, n.title, n.body, n.created_at, n.published_at
       FROM hry_notice n
       WHERE n.id = ?
         AND n.published_at IS NOT NULL
         AND (
           n.target_type = 'all'
           OR EXISTS (
             SELECT 1 FROM hry_notice_user nu
             WHERE nu.notice_id = n.id AND nu.user_id = ?
           )
         )
       LIMIT 1`,
      [id, uid]
    );
    if (!rows.length) {
      return res.status(404).json({ code: 404, message: '公告不存在或无权查看' });
    }
    const r = rows[0];
    return res.json({
      code: 0,
      data: {
        id: r.id,
        title: r.title,
        body: r.body,
        created_at: r.created_at,
        published_at: r.published_at,
      },
    });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;

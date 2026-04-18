const express = require('express');
const { getPool } = require('../config/db');
const { authRequired } = require('../middleware/auth');
const { parseJson } = require('../utils/json');
const { isAnswerCorrect } = require('../utils/answer');
const { assertUserWatchedVideo } = require('../utils/videoWatch');

const router = express.Router();
const pool = getPool();

router.use(authRequired);

router.get('/', async (req, res) => {
  const [list] = await pool.query(
    'SELECT id, title, url, sort_order, duration_sec, created_at FROM hry_video ORDER BY sort_order ASC, id ASC'
  );
  return res.json({ code: 0, data: list });
});

router.get('/:id/progress', async (req, res) => {
  const vid = Number(req.params.id);
  if (!Number.isFinite(vid)) {
    return res.status(400).json({ code: 400, message: '无效的视频 ID' });
  }
  const [rows] = await pool.query(
    'SELECT position_sec FROM hry_progress WHERE user_id = ? AND video_id = ?',
    [req.user.id, vid]
  );
  const position_sec = rows.length ? Number(rows[0].position_sec) : 0;
  return res.json({ code: 0, data: { position_sec } });
});

router.put('/:id/progress', async (req, res) => {
  const vid = Number(req.params.id);
  if (!Number.isFinite(vid)) {
    return res.status(400).json({ code: 400, message: '无效的视频 ID' });
  }
  let sec = Number((req.body || {}).position_sec);
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  sec = Math.floor(sec);
  await pool.query(
    `INSERT INTO hry_progress (user_id, video_id, position_sec) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       position_sec = GREATEST(COALESCE(position_sec, 0), VALUES(position_sec)),
       updated_at = CURRENT_TIMESTAMP`,
    [req.user.id, vid, sec]
  );
  return res.json({ code: 0, data: { position_sec: sec } });
});

router.get('/:id/questions', async (req, res) => {
  const vid = Number(req.params.id);
  if (!Number.isFinite(vid)) {
    return res.status(400).json({ code: 400, message: '无效的视频 ID' });
  }
  const watch = await assertUserWatchedVideo(req.user.id, vid);
  if (!watch.ok) {
    return res.status(403).json({ code: 403, message: watch.message });
  }
  const [qs] = await pool.query(
    `SELECT id, video_id, type, content, options, sort_order
     FROM hry_question WHERE video_id = ? ORDER BY sort_order ASC, id ASC`,
    [vid]
  );
  const data = qs.map((q) => ({
    id: q.id,
    video_id: q.video_id,
    type: q.type,
    content: q.content,
    options: parseJson(q.options),
    sort_order: q.sort_order,
  }));
  return res.json({ code: 0, data });
});

router.post('/:id/quiz/submit', async (req, res) => {
  const vid = Number(req.params.id);
  if (!Number.isFinite(vid)) {
    return res.status(400).json({ code: 400, message: '无效的视频 ID' });
  }
  const watch = await assertUserWatchedVideo(req.user.id, vid);
  if (!watch.ok) {
    return res.status(403).json({ code: 403, message: watch.message });
  }
  const { answers } = req.body || {};
  if (!Array.isArray(answers)) {
    return res.status(400).json({ code: 400, message: 'answers 须为数组' });
  }

  const [qs] = await pool.query(
    `SELECT id, video_id, type, content, options, correct_answer, analysis
     FROM hry_question WHERE video_id = ?`,
    [vid]
  );
  if (!qs.length) {
    return res.status(404).json({ code: 404, message: '该课程暂无题目' });
  }

  const byId = Object.fromEntries(qs.map((q) => [q.id, q]));
  const details = [];
  let correctCount = 0;

  for (const item of answers) {
    const qid = Number(item.question_id);
    const q = byId[qid];
    if (!q) continue;
    const ok = isAnswerCorrect(q.type, q.correct_answer, item.user_answer);
    if (ok) correctCount += 1;
    details.push({
      question_id: qid,
      type: q.type,
      is_correct: ok,
      correct_answer: parseJson(q.correct_answer),
      analysis: q.analysis,
    });
  }

  const total = qs.length;
  const score = correctCount;

  try {
    await pool.query(
      `INSERT INTO hry_quiz_record (user_id, video_id, score, total, detail_json)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, vid, score, total, JSON.stringify({ details, submitted: answers })]
    );
    const wrongIds = details.filter((d) => !d.is_correct).map((d) => d.question_id);
    if (wrongIds.length) {
      const ph = wrongIds.map(() => '?').join(',');
      await pool.query(
        `DELETE FROM hry_wrong_removed WHERE user_id = ? AND question_id IN (${ph})`,
        [req.user.id, ...wrongIds]
      );
    }
  } catch (e) {
    console.error('hry_quiz_record insert', e.message);
  }

  return res.json({
    code: 0,
    data: {
      video_id: vid,
      score,
      total,
      correct: correctCount,
      details,
    },
  });
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ code: 400, message: '无效的视频 ID' });
  }
  const [rows] = await pool.query(
    'SELECT id, title, url, sort_order, duration_sec, created_at FROM hry_video WHERE id = ?',
    [id]
  );
  if (!rows.length) return res.status(404).json({ code: 404, message: '视频不存在' });
  const [quizRows] = await pool.query(
    `SELECT score, total, created_at FROM hry_quiz_record
     WHERE user_id = ? AND video_id = ?
     ORDER BY created_at DESC, id DESC LIMIT 1`,
    [req.user.id, id]
  );
  const latest_quiz = quizRows.length
    ? {
        score: Number(quizRows[0].score) || 0,
        total: Number(quizRows[0].total) || 0,
        created_at: quizRows[0].created_at,
      }
    : null;
  return res.json({ code: 0, data: { ...rows[0], latest_quiz } });
});

module.exports = router;

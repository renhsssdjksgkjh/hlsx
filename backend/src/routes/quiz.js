const express = require('express');
const { getPool } = require('../config/db');
const { authRequired } = require('../middleware/auth');
const { parseJson } = require('../utils/json');

const router = express.Router();
const pool = getPool();

router.use(authRequired);

/**
 * @param {number} userId
 * @returns {Promise<Array>}
 */
async function fetchWrongListForUser(userId) {
  const [records] = await pool.query(
    `SELECT id, video_id, detail_json, created_at FROM hry_quiz_record WHERE user_id = ? ORDER BY created_at ASC`,
    [userId]
  );

  const wrongMeta = new Map();

  for (const rec of records) {
    const payload = parseJson(rec.detail_json);
    if (!payload || !Array.isArray(payload.details)) continue;
    for (const d of payload.details) {
      if (d.is_correct) continue;
      const qid = Number(d.question_id);
      if (!Number.isFinite(qid)) continue;
      const prev = wrongMeta.get(qid);
      const t = rec.created_at;
      if (!prev || new Date(t) > new Date(prev.recorded_at)) {
        wrongMeta.set(qid, {
          recorded_at: t,
          video_id: rec.video_id,
          detail: d,
        });
      }
    }
  }

  if (!wrongMeta.size) {
    return [];
  }

  const qids = [...wrongMeta.keys()];
  const placeholders = qids.map(() => '?').join(',');
  const [questions] = await pool.query(
    `SELECT q.id, q.video_id, q.type, q.content, q.options, q.analysis,
            v.title AS video_title, v.sort_order AS video_sort_order
     FROM hry_question q
     INNER JOIN hry_video v ON v.id = q.video_id
     WHERE q.id IN (${placeholders})`,
    qids
  );

  const byQid = Object.fromEntries(questions.map((q) => [q.id, q]));
  const data = [];
  for (const qid of qids) {
    const row = byQid[qid];
    if (!row) continue;
    const meta = wrongMeta.get(qid);
    data.push({
      question_id: row.id,
      video_id: row.video_id,
      video_title: row.video_title,
      video_sort_order: row.video_sort_order,
      type: row.type,
      content: row.content,
      options: parseJson(row.options),
      analysis: row.analysis != null ? row.analysis : meta.detail.analysis ?? null,
      correct_answer: meta.detail.correct_answer,
      last_wrong_at: meta.recorded_at,
    });
  }
  data.sort((a, b) => new Date(b.last_wrong_at) - new Date(a.last_wrong_at));
  return data;
}

/**
 * 汇总 hry_quiz_record.detail_json 中所有答错的题目（去重后保留最近一次答错时间与解析）
 */
router.get('/wrong', async (req, res) => {
  const data = await fetchWrongListForUser(req.user.id);
  return res.json({ code: 0, data });
});

/**
 * 单道错题详情（须在用户错题集中）
 */
router.get('/wrong/:questionId', async (req, res) => {
  const qid = Number(req.params.questionId);
  if (!Number.isFinite(qid)) {
    return res.status(400).json({ code: 400, message: '无效的题目 ID' });
  }
  const list = await fetchWrongListForUser(req.user.id);
  const item = list.find((x) => x.question_id === qid);
  if (!item) {
    return res.status(404).json({ code: 404, message: '未找到该错题或无权查看' });
  }
  return res.json({ code: 0, data: item });
});

module.exports = router;

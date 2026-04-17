const { getPool } = require('../config/db');
const { parseJson } = require('../utils/json');

/**
 * 从测验记录解析出每题最近一次答错元数据（不去除「已移出错题集」）
 * @param {number} userId
 * @returns {Promise<Map<number, { recorded_at: any, video_id: number, detail: object }>>}
 */
async function fetchWrongMetaMap(userId) {
  const pool = getPool();
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

  return wrongMeta;
}

/**
 * @param {number} userId
 * @returns {Promise<Set<number>>}
 */
async function fetchRemovedQuestionIds(userId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT question_id FROM hry_wrong_removed WHERE user_id = ?`,
    [userId]
  );
  return new Set(rows.map((r) => Number(r.question_id)));
}

/**
 * 汇总 hry_quiz_record.detail_json 中所有答错的题目（去重后保留最近一次答错时间与解析），并排除用户已移出错题集的题目
 * @param {number} userId
 * @returns {Promise<Array>}
 */
async function fetchWrongListForUser(userId) {
  const wrongMeta = await fetchWrongMetaMap(userId);
  if (!wrongMeta.size) {
    return [];
  }

  const removed = await fetchRemovedQuestionIds(userId);
  const qids = [...wrongMeta.keys()].filter((qid) => !removed.has(qid));
  if (!qids.length) {
    return [];
  }

  const pool = getPool();
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
 * 将题目从当前用户错题集中移除（写入 hry_wrong_removed）
 * @returns {Promise<boolean>} 是否允许本次操作成功（测验中曾错且（新写入或已移出）为 true；从未错该题为 false）
 */
async function removeWrongFromBook(userId, questionId) {
  const wrongMeta = await fetchWrongMetaMap(userId);
  if (!wrongMeta.has(questionId)) {
    return false;
  }
  const removed = await fetchRemovedQuestionIds(userId);
  if (removed.has(questionId)) {
    return true;
  }
  const pool = getPool();
  await pool.query(`INSERT IGNORE INTO hry_wrong_removed (user_id, question_id) VALUES (?, ?)`, [
    userId,
    questionId,
  ]);
  return true;
}

module.exports = { fetchWrongListForUser, removeWrongFromBook };

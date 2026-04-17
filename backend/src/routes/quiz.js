const express = require('express');
const { getPool } = require('../config/db');
const { authRequired } = require('../middleware/auth');
const { fetchWrongListForUser, removeWrongFromBook } = require('../services/wrongList');

const router = express.Router();
const pool = getPool();

router.use(authRequired);

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

/**
 * 从当前用户错题集中移除该题（写入 hry_wrong_removed，不改测验历史）
 */
router.delete('/wrong/:questionId', async (req, res) => {
  const qid = Number(req.params.questionId);
  if (!Number.isFinite(qid)) {
    return res.status(400).json({ code: 400, message: '无效的题目 ID' });
  }
  const ok = await removeWrongFromBook(req.user.id, qid);
  if (!ok) {
    return res.status(404).json({ code: 404, message: '未找到该错题或无权操作' });
  }
  return res.json({ code: 0, data: null });
});

module.exports = router;

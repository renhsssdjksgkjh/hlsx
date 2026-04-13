const { getPool } = require('../config/db');

/** 与前端 play.vue / 测验入口一致：有有效时长则需看到接近结尾；无时长则至少 30 秒进度 */
const NO_DURATION_MIN_SEC = 30;
const END_TOLERANCE_SEC = 3;

/**
 * @returns {Promise<{ ok: true } | { ok: false, message: string }>}
 */
async function assertUserWatchedVideo(userId, videoId) {
  const pool = getPool();
  const [vrows] = await pool.query('SELECT duration_sec FROM hry_video WHERE id = ?', [videoId]);
  if (!vrows.length) {
    return { ok: false, message: '视频不存在' };
  }
  const dur = Number(vrows[0].duration_sec) || 0;
  const [prows] = await pool.query(
    'SELECT position_sec FROM hry_progress WHERE user_id = ? AND video_id = ?',
    [userId, videoId]
  );
  const pos = prows.length ? Number(prows[0].position_sec) || 0 : 0;

  if (dur > 0) {
    if (pos < dur - END_TOLERANCE_SEC) {
      return { ok: false, message: '请先完整观看视频后再测验' };
    }
  } else if (pos < NO_DURATION_MIN_SEC) {
    return { ok: false, message: '请观看视频后再测验' };
  }
  return { ok: true };
}

module.exports = { assertUserWatchedVideo };

const { parseJson } = require('./json');

/**
 * 接口 body 里的 user_answer 已被 JSON 解析：单选多为字符串 "A"，
 * 不能对 "A" 再 JSON.parse（会失败）。数据库里的 correct_answer 仍是 JSON 文本，用 parseJson。
 */
function parseUserAnswer(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'boolean' || typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

function normalizeType(t) {
  const u = String(t || '').trim();
  const s = u.toLowerCase();
  if (s === 'single' || s === 'single_choice' || u === '单选题' || u === '单选') return 'single';
  if (s === 'multi' || s === 'multiple' || s === 'multiple_choice' || u === '多选题' || u === '多选') {
    return 'multi';
  }
  if (s === 'judge' || s === 'judgment' || s === 'true_false' || u === '判断题' || u === '判断') {
    return 'judge';
  }
  return s;
}

function isAnswerCorrect(type, correctRaw, userRaw) {
  const t = normalizeType(type);
  const correct = parseJson(correctRaw);
  const user = parseUserAnswer(userRaw);

  if (t === 'multi') {
    const ca = (Array.isArray(correct) ? correct : [correct]).map(String);
    const ua = (Array.isArray(user) ? user : user == null ? [] : [user]).map(String);
    if (ca.length !== ua.length) return false;
    const a = [...ca].sort();
    const b = [...ua].sort();
    return a.every((v, i) => v === b[i]);
  }

  if (t === 'judge') {
    const c = Array.isArray(correct) ? correct[0] : correct;
    const u = Array.isArray(user) ? user[0] : user;
    return String(c).toLowerCase() === String(u).toLowerCase();
  }

  const c = Array.isArray(correct) ? correct[0] : correct;
  const u = Array.isArray(user) ? user[0] : user;
  return String(c) === String(u);
}

module.exports = { normalizeType, isAnswerCorrect };

const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  const raw = req.headers.authorization || '';
  const m = raw.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    return res.status(401).json({ code: 401, message: '未登录或 token 无效' });
  }
  try {
    const payload = jwt.verify(m[1], process.env.JWT_SECRET);
    req.user = { id: payload.uid, phone: payload.phone };
    next();
  } catch {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }
}

module.exports = { authRequired };

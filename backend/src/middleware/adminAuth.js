const jwt = require('jsonwebtoken');

function adminAuth(req, res, next) {
  const raw = req.headers.authorization || '';
  const m = raw.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    return res.status(401).json({ code: 401, message: '未登录或 token 无效' });
  }
  try {
    const payload = jwt.verify(m[1], process.env.JWT_SECRET);
    if (payload.role !== 'admin' || !payload.aid) {
      return res.status(403).json({ code: 403, message: '无权访问管理接口' });
    }
    req.admin = { id: Number(payload.aid), username: payload.username };
    next();
  } catch {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }
}

module.exports = { adminAuth };

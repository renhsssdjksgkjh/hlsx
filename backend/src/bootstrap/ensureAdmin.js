const bcrypt = require('bcryptjs');
const { getPool } = require('../config/db');

/**
 * 确保存在 hry_admin 表及默认管理员 admin / admin123（若尚无 admin 行）
 * 服务启动时调用；也可由 npm run seed:admin 单独执行
 */
async function ensureAdminReady() {
  const pool = getPool();
  // 旧版 MySQL 仅允许一个 TIMESTAMP 带 CURRENT_TIMESTAMP；updated_at 用 DATETIME，更新时在 SQL 里写 NOW()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hry_admin (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(64) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [rows] = await pool.query('SELECT id FROM hry_admin WHERE username = ? LIMIT 1', [
    'admin',
  ]);
  if (rows.length) {
    return;
  }
  const hash = await bcrypt.hash('admin123', 10);
  await pool.query(
    'INSERT INTO hry_admin (username, password_hash, updated_at) VALUES (?, ?, NOW())',
    ['admin', hash]
  );
  console.log('[huling-api] 已创建默认管理员: admin / admin123（请尽快修改密码）');
}

module.exports = { ensureAdminReady };

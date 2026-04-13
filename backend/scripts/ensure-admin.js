/**
 * 创建 hry_admin 表（若不存在）并确保存在默认管理员 admin / admin123
 * 用法: node scripts/ensure-admin.js（需在 backend 目录且已配置 .env）
 */
require('dotenv').config();
const { ensureAdminReady } = require('../src/bootstrap/ensureAdmin');

ensureAdminReady()
  .then(() => {
    console.log('[ensure-admin] 完成');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

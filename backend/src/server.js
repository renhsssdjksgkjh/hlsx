require('dotenv').config();
const http = require('http');

if (!process.env.JWT_SECRET) {
  console.warn(
    '[warn] JWT_SECRET 未设置：请复制 backend/.env.example 为 .env，并填写 JWT_SECRET（随机长字符串）'
  );
}

const { ensureAdminReady } = require('./bootstrap/ensureAdmin');
const app = require('./app');

const basePort = Number(process.env.PORT || 3001);
const maxAttempts = 20;

function listenOn(server, port, attemptsLeft) {
  const onError = (err) => {
    server.removeListener('error', onError);
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      const next = port + 1;
      console.warn(`[huling-api] 端口 ${port} 已被占用，尝试 ${next}`);
      server.close(() => {
        listenOn(server, next, attemptsLeft - 1);
      });
      return;
    }
    console.error('[huling-api] 无法监听端口:', err.message);
    process.exit(1);
  };

  server.once('error', onError);
  server.listen(port, () => {
    server.removeListener('error', onError);
    console.log(`[huling-api] http://0.0.0.0:${port}`);
  });
}

async function main() {
  try {
    await ensureAdminReady();
  } catch (e) {
    console.error('[huling-api] 初始化 hry_admin 失败:', e.message || e);
    process.exit(1);
  }
  const server = http.createServer(app);
  listenOn(server, basePort, maxAttempts);
}

main();

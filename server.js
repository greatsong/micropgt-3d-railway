import { createServer } from 'node:http';
import next from 'next';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { registerSocketHandlers } from './backend/socketHandlers.js';
import { rooms } from './backend/roomManager.js';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const expressApp = express();
  // 화면과 API는 같은 주소에서 서빙되므로 다른 사이트에 CORS를 열어 두지 않는다
  expressApp.use(express.json());

  // ── REST API ──
  expressApp.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // 방 코드는 입장 권한이므로 내보내지 않는다. 운영 확인용 합계만 알려 준다
  expressApp.get('/api/rooms', (req, res) => {
    let studentCount = 0;
    rooms.forEach((room) => { studentCount += room.students.size; });
    res.json({ roomCount: rooms.size, studentCount });
  });

  // Next.js 요청 핸들러
  expressApp.all('*', (req, res) => handle(req, res));

  const httpServer = createServer(expressApp);

  // ── Socket.io ──
  const io = new SocketIOServer(httpServer, {
    pingTimeout: 60000,
    pingInterval: 25000,
    cors: {
      // 운영에서는 같은 주소에서만 접속한다. 다른 사이트에 소켓 CORS를 허용하지 않는다
      origin: dev ? ['http://localhost:3000', 'http://localhost:3030'] : false,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  registerSocketHandlers(io);

  httpServer.listen(port, hostname, () => {
    console.log(`
  ╔══════════════════════════════════════════════╗
  ║  🚀 MicroGPT 3D Learning Lab 서버 가동 중     ║
  ║  📡 Port: ${port}                              ║
  ║  🌐 Mode: ${dev ? 'development' : 'production'}                    ║
  ╚══════════════════════════════════════════════╝
    `);
  });
});

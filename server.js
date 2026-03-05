import { createServer } from 'node:http';
import next from 'next';
import express from 'express';
import cors from 'cors';
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
  expressApp.use(cors());
  expressApp.use(express.json());

  // ── REST API ──
  expressApp.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  expressApp.get('/api/rooms', (req, res) => {
    const roomList = [];
    rooms.forEach((room, code) => {
      roomList.push({
        roomCode: code,
        studentCount: room.students.size,
        hasTeacher: !!room.teacherId,
      });
    });
    res.json(roomList);
  });

  // Next.js 요청 핸들러
  expressApp.all('*', (req, res) => handle(req, res));

  const httpServer = createServer(expressApp);

  // ── Socket.io ──
  const io = new SocketIOServer(httpServer, {
    pingTimeout: 60000,
    pingInterval: 25000,
    cors: {
      origin: dev
        ? ['http://localhost:3000', 'http://localhost:3030']
        : (origin, callback) => {
            // Same-origin 요청(origin undefined) 및 Railway 도메인 허용
            callback(null, true);
          },
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

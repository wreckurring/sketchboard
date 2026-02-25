import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { redisPubSub, redisClient } from './utils/redis.js';

dotenv.config();

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 10000;

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket'],
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', port: PORT });
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join-session', async ({ sessionId, userId }) => {
    socket.removeAllListeners('canvas-change');
    socket.removeAllListeners('cursor-move');
    socket.join(sessionId);
    
    await redisPubSub.setPresence(userId, sessionId);

    const channelName = `session:${sessionId}`;
    const handleMessage = (data) => socket.emit('canvas-update', data);

    redisPubSub.subscribe(channelName, handleMessage);

    socket.on('canvas-change', (data) => {
      redisPubSub.publish(channelName, { ...data, userId });
    });

    socket.on('cursor-move', (data) => {
      redisPubSub.publish(`${channelName}:cursor`, { ...data, userId });
    });

    socket.once('disconnect', () => {
      redisPubSub.clearPresence(userId, sessionId);
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
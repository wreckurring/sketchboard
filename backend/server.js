import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

import { redisPubSub, redisClient } from './utils/redis.js';
import { rateLimitMiddleware, wsRateLimitMiddleware } from './middleware/rateLimitMiddleware.js';
import { wsLimiter } from './utils/rateLimiter.js';
import { redisCircuitBreaker } from './utils/circuitBreaker.js';
import healthRouter, { incrementRequestCount, incrementErrorCount } from './routes/health.js';
import metricsRouter, { trackRequest, trackWebSocket, trackRedis } from './routes/metrics.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  incrementRequestCount();
  next();
});

app.use('/api', rateLimitMiddleware());

app.use(healthRouter);
app.use(metricsRouter);

io.use(wsRateLimitMiddleware(wsLimiter));

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  trackWebSocket('connection');

  socket.on('join-session', async ({ sessionId, userId }) => {
    socket.removeAllListeners('canvas-change');
    socket.removeAllListeners('cursor-move');
    
    socket.join(sessionId);
    
    await redisCircuitBreaker.execute(
      () => redisPubSub.setPresence(userId, sessionId),
      () => console.warn('Presence tracking unavailable')
    );

    const channelName = `session:${sessionId}`;
    const handleMessage = (data) => {
      socket.emit('canvas-update', data);
    };

    redisPubSub.subscribe(channelName, handleMessage);

    socket.on('canvas-change', async (data) => {
      trackWebSocket('message');
      await redisCircuitBreaker.execute(
        () => redisPubSub.publish(channelName, { ...data, userId }),
        () => socket.to(sessionId).emit('canvas-update', { ...data, userId })
      );
    });

    socket.on('cursor-move', async (data) => {
      await redisCircuitBreaker.execute(
        () => redisPubSub.publish(`${channelName}:cursor`, { ...data, userId }),
        // fallback to local broadcast if Redis is down
        () => socket.to(sessionId).emit('cursor-update', { ...data, userId })
      );
    });

    socket.once('disconnect', async () => {
      await redisCircuitBreaker.execute(
        () => redisPubSub.clearPresence(userId, sessionId),
        () => console.warn('Failed to clear presence')
      );
      redisPubSub.unsubscribe(channelName, handleMessage);
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
    incrementErrorCount();
  });
});

app.use((err, req, res, next) => {
  incrementErrorCount();
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server gracefully...');
  server.close(async () => {
    await redisClient.quit();
    process.exit(0);
  });
});
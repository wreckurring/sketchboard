import { apiLimiter } from '../utils/rateLimiter.js';

export const rateLimitMiddleware = () => async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const allowed = await apiLimiter.consume(ip);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
  next();
};

export const wsRateLimitMiddleware = (limiter) => async (socket, next) => {
  const ip = socket.handshake.address;
  const allowed = await limiter.consume(ip);
  if (!allowed) {
    return next(new Error('WebSocket rate limit exceeded'));
  }
  next();
};
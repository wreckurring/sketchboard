import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  tls: {
    rejectUnauthorized: false 
  },
  maxRetriesPerRequest: null, 
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

export const redisClient = new Redis(redisConfig);
export const redisSubscriber = new Redis(redisConfig);

const handleRedisError = (name, err) => {
  console.error(`Redis ${name} Error:`, err.message);
};

redisClient.on('error', (err) => handleRedisError('Client', err));
redisSubscriber.on('error', (err) => handleRedisError('Subscriber', err));

redisClient.on('connect', () => console.log('Redis Client Connected'));
redisSubscriber.on('connect', () => console.log('Redis Subscriber Connected'));

const channelCallbacks = new Map();

redisSubscriber.on('message', (channel, message) => {
  const callbacks = channelCallbacks.get(channel);
  if (callbacks) {
    try {
      const parsedData = JSON.parse(message);
      callbacks.forEach(cb => cb(parsedData));
    } catch (e) {
      console.error('Failed to parse Redis message:', e);
    }
  }
});

export const redisPubSub = {
  async publish(channel, data) {
    try {
      await redisClient.publish(channel, JSON.stringify(data));
    } catch (error) {
      console.error('Redis Publish Error:', error);
    }
  },

  subscribe(channel, callback) {
    if (!channelCallbacks.has(channel)) {
      channelCallbacks.set(channel, new Set());
      redisSubscriber.subscribe(channel);
    }
    channelCallbacks.get(channel).add(callback);
  },

  unsubscribe(channel, callback) {
    const callbacks = channelCallbacks.get(channel);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        redisSubscriber.unsubscribe(channel);
        channelCallbacks.delete(channel);
      }
    }
  },

  async setPresence(userId, sessionId) {
    const key = `presence:${sessionId}`;
    await redisClient.sadd(key, userId);
    await redisClient.expire(key, 3600);
  },

  async clearPresence(userId, sessionId) {
    await redisClient.srem(`presence:${sessionId}`, userId);
  }
};
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

redisClient.on('connect', () => console.log('✅ Redis Client Connected'));
redisSubscriber.on('connect', () => console.log('✅ Redis Subscriber Connected'));

export const redisPubSub = {
  async publish(channel, data) {
    try {
      await redisClient.publish(channel, JSON.stringify(data));
    } catch (error) {
      console.error('Redis Publish Error:', error);
    }
  },

  subscribe(channel, callback) {
    redisSubscriber.subscribe(channel);
    redisSubscriber.on('message', (chan, message) => {
      if (chan === channel) {
        callback(JSON.parse(message));
      }
    });
  },

  unsubscribe(channel) {
    redisSubscriber.unsubscribe(channel);
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
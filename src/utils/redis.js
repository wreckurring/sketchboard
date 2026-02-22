import Redis from 'ioredis';

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

const redisSubscriber = redisClient.duplicate();

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisSubscriber.on('error', (err) => console.error('Redis Subscriber Error:', err));

export class RedisPubSub {
  constructor() {
    this.subscribers = new Map();
  }

  async publish(channel, message) {
    try {
      const payload = JSON.stringify(message);
      await redisClient.publish(channel, payload);
      return true;
    } catch (error) {
      console.error('Redis publish error:', error);
      return false;
    }
  }

  subscribe(channel, callback) {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
      redisSubscriber.subscribe(channel);
    }
    
    this.subscribers.get(channel).add(callback);

    redisSubscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          const data = JSON.parse(message);
          this.subscribers.get(channel).forEach(cb => cb(data));
        } catch (error) {
          console.error('Message parse error:', error);
        }
      }
    });
  }

  unsubscribe(channel, callback) {
    const subs = this.subscribers.get(channel);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        redisSubscriber.unsubscribe(channel);
        this.subscribers.delete(channel);
      }
    }
  }

  async setPresence(userId, sessionId, ttl = 30) {
    const key = `presence:${sessionId}:${userId}`;
    await redisClient.setex(key, ttl, JSON.stringify({
      userId,
      sessionId,
      timestamp: Date.now(),
    }));
  }

  async getPresence(sessionId) {
    const pattern = `presence:${sessionId}:*`;
    const keys = await redisClient.keys(pattern);
    const users = await Promise.all(
      keys.map(async (key) => {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
      })
    );
    return users.filter(Boolean);
  }

  async clearPresence(userId, sessionId) {
    const key = `presence:${sessionId}:${userId}`;
    await redisClient.del(key);
  }
}

export const redisPubSub = new RedisPubSub();
export { redisClient };

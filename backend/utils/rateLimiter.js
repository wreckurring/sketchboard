import { redisClient } from './redis.js';

export class TokenBucketRateLimiter {
  constructor(options = {}) {
    this.capacity = options.capacity || 100;
    this.refillRate = options.refillRate || 10;
    this.refillInterval = options.refillInterval || 1000;
  }

  async consume(key, tokens = 1) {
    const bucketKey = `rate_limit:${key}`;
    const now = Date.now();

    const script = `
      local bucketKey = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local refillInterval = tonumber(ARGV[3])
      local tokens = tonumber(ARGV[4])
      local now = tonumber(ARGV[5])

      local bucket = redis.call('HMGET', bucketKey, 'tokens', 'lastRefill')
      local currentTokens = tonumber(bucket[1]) or capacity
      local lastRefill = tonumber(bucket[2]) or now

      local timePassed = now - lastRefill
      local refillAmount = math.floor(timePassed / refillInterval) * refillRate
      currentTokens = math.min(capacity, currentTokens + refillAmount)

      if currentTokens >= tokens then
        currentTokens = currentTokens - tokens
        redis.call('HMSET', bucketKey, 'tokens', currentTokens, 'lastRefill', now)
        redis.call('EXPIRE', bucketKey, 3600)
        return 1
      else
        redis.call('HMSET', bucketKey, 'tokens', currentTokens, 'lastRefill', now)
        redis.call('EXPIRE', bucketKey, 3600)
        return 0
      end
    `;

    try {
      const result = await redisClient.eval(
        script,
        1,
        bucketKey,
        this.capacity,
        this.refillRate,
        this.refillInterval,
        tokens,
        now
      );
      return result === 1;
    } catch (error) {
      console.error('Rate limiter error:', error);
      return true;
    }
  }

  async getRemainingTokens(key) {
    const bucketKey = `rate_limit:${key}`;
    const bucket = await redisClient.hmget(bucketKey, 'tokens', 'lastRefill');
    
    if (!bucket[0]) return this.capacity;

    const currentTokens = parseInt(bucket[0], 10);
    const lastRefill = parseInt(bucket[1], 10);
    const now = Date.now();
    const timePassed = now - lastRefill;
    const refillAmount = Math.floor(timePassed / this.refillInterval) * this.refillRate;
    
    return Math.min(this.capacity, currentTokens + refillAmount);
  }
}

export const apiLimiter = new TokenBucketRateLimiter({
  capacity: 100,
  refillRate: 10,
  refillInterval: 1000,
});

export const wsLimiter = new TokenBucketRateLimiter({
  capacity: 200,
  refillRate: 50,
  refillInterval: 1000,
});

import express from 'express';
import { redisClient } from '../utils/redis.js';
import { redisCircuitBreaker, dbCircuitBreaker } from '../utils/circuitBreaker.js';

const router = express.Router();

let startTime = Date.now();
let requestCount = 0;
let errorCount = 0;

export const incrementRequestCount = () => requestCount++;
export const incrementErrorCount = () => errorCount++;

router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks: {},
  };

  try {
    await redisClient.ping();
    health.checks.redis = { status: 'up' };
  } catch (error) {
    health.checks.redis = { status: 'down', error: error.message };
    health.status = 'degraded';
  }

  health.checks.memory = {
    usage: process.memoryUsage(),
    heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
  };

  health.checks.circuitBreakers = {
    redis: redisCircuitBreaker.getState(),
    database: dbCircuitBreaker.getState(),
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

router.get('/health/ready', async (req, res) => {
  try {
    await redisClient.ping();
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
});

router.get('/health/live', (req, res) => {
  res.status(200).json({ alive: true });
});

router.get('/metrics', (req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const memUsage = process.memoryUsage();

  const metrics = {
    uptime_seconds: uptime,
    requests_total: requestCount,
    errors_total: errorCount,
    requests_per_second: (requestCount / uptime).toFixed(2),
    error_rate: requestCount > 0 ? (errorCount / requestCount * 100).toFixed(2) + '%' : '0%',
    memory: {
      rss_mb: Math.round(memUsage.rss / 1024 / 1024),
      heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
      external_mb: Math.round(memUsage.external / 1024 / 1024),
    },
    circuit_breakers: {
      redis: redisCircuitBreaker.getState(),
      database: dbCircuitBreaker.getState(),
    },
  };

  res.setHeader('Content-Type', 'application/json');
  res.json(metrics);
});

export default router;

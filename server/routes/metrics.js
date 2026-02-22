import express from 'express';
import { redisClient } from '../utils/redis.js';
import { redisCircuitBreaker, dbCircuitBreaker } from '../utils/circuitBreaker.js';

const router = express.Router();

const metrics = {
  requests: {
    total: 0,
    success: 0,
    errors: 0,
    byEndpoint: new Map(),
  },
  websocket: {
    connections: 0,
    messages: 0,
    errors: 0,
  },
  redis: {
    operations: 0,
    errors: 0,
  },
  latency: {
    samples: [],
    max: 0,
    min: Infinity,
  },
};

const startTime = Date.now();

export const trackRequest = (endpoint, success = true, latency = 0) => {
  metrics.requests.total++;
  if (success) metrics.requests.success++;
  else metrics.requests.errors++;

  if (!metrics.requests.byEndpoint.has(endpoint)) {
    metrics.requests.byEndpoint.set(endpoint, { count: 0, errors: 0 });
  }
  const endpointMetrics = metrics.requests.byEndpoint.get(endpoint);
  endpointMetrics.count++;
  if (!success) endpointMetrics.errors++;

  if (latency > 0) {
    metrics.latency.samples.push(latency);
    metrics.latency.max = Math.max(metrics.latency.max, latency);
    metrics.latency.min = Math.min(metrics.latency.min, latency);
    if (metrics.latency.samples.length > 1000) {
      metrics.latency.samples.shift();
    }
  }
};

export const trackWebSocket = (type, success = true) => {
  if (type === 'connection') metrics.websocket.connections++;
  if (type === 'message') metrics.websocket.messages++;
  if (!success) metrics.websocket.errors++;
};

export const trackRedis = (success = true) => {
  metrics.redis.operations++;
  if (!success) metrics.redis.errors++;
};

router.get('/metrics', async (req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const memUsage = process.memoryUsage();

  const avgLatency = metrics.latency.samples.length > 0
    ? metrics.latency.samples.reduce((a, b) => a + b, 0) / metrics.latency.samples.length
    : 0;

  const p95Latency = metrics.latency.samples.length > 0
    ? metrics.latency.samples.sort((a, b) => a - b)[Math.floor(metrics.latency.samples.length * 0.95)]
    : 0;

  let redisStatus = 'unknown';
  try {
    await redisClient.ping();
    redisStatus = 'healthy';
  } catch {
    redisStatus = 'unhealthy';
  }

  const prometheusFormat = `
# HELP uptime_seconds Time since server started
# TYPE uptime_seconds gauge
uptime_seconds ${uptime}

# HELP requests_total Total number of requests
# TYPE requests_total counter
requests_total ${metrics.requests.total}

# HELP requests_success Total successful requests
# TYPE requests_success counter
requests_success ${metrics.requests.success}

# HELP requests_errors Total failed requests
# TYPE requests_errors counter
requests_errors ${metrics.requests.errors}

# HELP error_rate Request error rate
# TYPE error_rate gauge
error_rate ${metrics.requests.total > 0 ? (metrics.requests.errors / metrics.requests.total).toFixed(4) : 0}

# HELP websocket_connections Active WebSocket connections
# TYPE websocket_connections gauge
websocket_connections ${metrics.websocket.connections}

# HELP websocket_messages Total WebSocket messages
# TYPE websocket_messages counter
websocket_messages ${metrics.websocket.messages}

# HELP redis_operations Total Redis operations
# TYPE redis_operations counter
redis_operations ${metrics.redis.operations}

# HELP redis_errors Total Redis errors
# TYPE redis_errors counter
redis_errors ${metrics.redis.errors}

# HELP latency_avg_ms Average request latency in milliseconds
# TYPE latency_avg_ms gauge
latency_avg_ms ${avgLatency.toFixed(2)}

# HELP latency_p95_ms 95th percentile latency in milliseconds
# TYPE latency_p95_ms gauge
latency_p95_ms ${p95Latency.toFixed(2)}

# HELP memory_heap_used_bytes Heap memory used
# TYPE memory_heap_used_bytes gauge
memory_heap_used_bytes ${memUsage.heapUsed}

# HELP memory_rss_bytes Resident set size
# TYPE memory_rss_bytes gauge
memory_rss_bytes ${memUsage.rss}

# HELP circuit_breaker_redis_state Redis circuit breaker state (0=closed, 1=open, 2=half_open)
# TYPE circuit_breaker_redis_state gauge
circuit_breaker_redis_state ${redisCircuitBreaker.getState().state === 'CLOSED' ? 0 : redisCircuitBreaker.getState().state === 'OPEN' ? 1 : 2}

# HELP redis_health Redis health status (0=unhealthy, 1=healthy)
# TYPE redis_health gauge
redis_health ${redisStatus === 'healthy' ? 1 : 0}
`;

  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(prometheusFormat.trim());
});

router.get('/metrics/json', (req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  res.json({
    uptime_seconds: uptime,
    requests: {
      total: metrics.requests.total,
      success: metrics.requests.success,
      errors: metrics.requests.errors,
      error_rate: metrics.requests.total > 0 
        ? `${(metrics.requests.errors / metrics.requests.total * 100).toFixed(2)}%` 
        : '0%',
      by_endpoint: Object.fromEntries(metrics.requests.byEndpoint),
    },
    websocket: metrics.websocket,
    redis: metrics.redis,
    latency: {
      avg_ms: metrics.latency.samples.length > 0
        ? (metrics.latency.samples.reduce((a, b) => a + b, 0) / metrics.latency.samples.length).toFixed(2)
        : 0,
      min_ms: metrics.latency.min === Infinity ? 0 : metrics.latency.min,
      max_ms: metrics.latency.max,
    },
    circuit_breakers: {
      redis: redisCircuitBreaker.getState(),
      database: dbCircuitBreaker.getState(),
    },
  });
});

export default router;

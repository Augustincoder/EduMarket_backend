const client = require('prom-client');

const registry = new client.Registry();
client.collectDefaultMetrics({ registry });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

const activeConnections = new client.Gauge({
  name: 'websocket_connections_active',
  help: 'Active WebSocket connections',
  registers: [registry],
});

module.exports = {
  registry,
  httpRequestDuration,
  activeConnections,
};

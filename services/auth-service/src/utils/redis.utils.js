'use strict';

const Redis = require('ioredis');

const client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

client.on('connect',  () => console.log('[auth-service] Redis connected'));
client.on('error',    (err) => console.error('[auth-service] Redis error:', err.message));
client.on('reconnecting', () => console.warn('[auth-service] Redis reconnecting…'));

module.exports = client;

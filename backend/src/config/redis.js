const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let client;

async function getRedisClient() {
  if (!client) {
    client = createClient({ url: REDIS_URL });
    client.on('error', (err) => {
      // Log but don't crash the app; caching is optional
      console.error('Redis Client Error', err);
    });
    await client.connect();
  }
  return client;
}

async function get(key) {
  const c = await getRedisClient();
  const value = await c.get(key);
  if (!value) return null;
  return JSON.parse(value);
}

async function set(key, value, ttlSeconds = 60) {
  const c = await getRedisClient();
  const stringified = JSON.stringify(value);
  if (ttlSeconds) {
    await c.set(key, stringified, { EX: ttlSeconds });
  } else {
    await c.set(key, stringified);
  }
}

async function del(key) {
  const c = await getRedisClient();
  await c.del(key);
}

module.exports = {
  getRedisClient,
  get,
  set,
  del,
};


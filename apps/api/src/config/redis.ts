import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!, {
  tls: process.env.NODE_ENV === 'production' ? {} : undefined,
});

export default redis;
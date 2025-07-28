import { Queue } from 'bullmq';
import redis from '../../../config/redis.js';
import { FixJobData } from '../../../types/jobs.js';

export const scanQueue = new Queue('repo-scan', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 60000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const fixQueue = new Queue<FixJobData>('bug-fix', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 30000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});


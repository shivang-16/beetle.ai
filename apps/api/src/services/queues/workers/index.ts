import { Worker } from 'bullmq';
import redis from '../../../config/redis.js';
import { scanQueue, fixQueue } from '../producers/index.js';
import type { FixJobData, ScanJobData } from '../../../types/jobs.js';
// import { runInSandbox } from '../../utils/sandboxClient.js';

new Worker<ScanJobData>('repo-scan', async job => {
  const { repoUrl, commitSha, autoApprove } = job.data;
  // const report = await runInSandbox(repoUrl, commitSha);
  // // Assume report.issues array
  // if (autoApprove && report.issues.length > 0) {
  //   await fixQueue.add('bug-fix', { repoUrl, issues: report.issues });
  // }
}, { connection: redis, concurrency: 5 });

new Worker<FixJobData>('bug-fix', async job => {
    const { repoUrl, issues } = job.data;
    // Pass issues to sandbox for auto-fixing
    // await runInSandbox(repoUrl, job.data);
  }, { connection: redis, concurrency: 2 });
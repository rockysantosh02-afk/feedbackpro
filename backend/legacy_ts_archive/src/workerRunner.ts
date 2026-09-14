import dotenv from 'dotenv';
import { AuditWorker } from './workers/auditWorker.js';

dotenv.config();

const worker = new AuditWorker();

process.on('SIGINT', () => {
  worker.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  worker.stop();
  process.exit(0);
});

worker.start().catch((err) => {
  console.error('[AuditWorker:Fatal]', err);
  process.exit(1);
});

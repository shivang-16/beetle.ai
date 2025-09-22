// apps/api/src/server.ts
import { createApp } from './app.js';
import connectDB from './db/db.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 3000;
const app = createApp();

connectDB();

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
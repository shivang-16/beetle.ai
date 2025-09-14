// apps/api/src/server.ts
import { createApp } from './app.js';
import connectDB from './db/db.js';
import { logInfo } from './utils/logger.js';

const PORT = process.env.PORT || 3000;
const app = createApp();

connectDB();

app.listen(PORT, () => {
  logInfo(`Server running on port ${PORT}`);
});
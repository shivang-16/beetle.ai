// apps/api/src/server.ts
import { createApp } from './app.js';
import connectDB from './db/db.js';
import { env } from './config/env.js';

const PORT = env.PORT;
const app = createApp();

connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/db.js';
import app from './api/app.js';

const port = Number(process.env.PORT ?? 5050);

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`✅ API listening on http://localhost:${port}`));
  })
  .catch((err) => {
    console.error('DB connection failed:', err);
    process.exit(1);
  });

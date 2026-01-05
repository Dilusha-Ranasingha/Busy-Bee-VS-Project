import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';

import productRoutes from '../features/products/products.routes.js';
import { errorHandler } from '../middlewares/error.js';

// ✅ NEW: todo-tracker router
import todoTrackerRoutes from '../features/todo-tracker/todoTracker.routes.js';

const app: Application = express();

app.use(cors());

// allow bigger payloads (todo + candidate files list)
app.use(express.json({ limit: '2mb' }));

app.use(morgan('dev'));

app.get('/api/health', (_: Request, res: Response) => res.json({ ok: true }));

app.use('/api/products', productRoutes);

// ✅ NEW: todo-tracker routes
app.use('/api/todo-tracker', todoTrackerRoutes);

app.use(errorHandler);

export default app;

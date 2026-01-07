// in this app.ts file, we set uped all routes API points for the express application

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import productRoutes from '../features/products/products.routes.js';
import fileSwitchRoutes from '../features/Metrics-Tracking/fileSwitch/fileSwitch.routes.js';
import focusStreakRoutes from '../features/Metrics-Tracking/focusStreak/focusStreak.routes.js';
import editSessionsRoutes from '../features/Metrics-Tracking/editSessions/editSessions.routes.js';
import saveEditSessionsRoutes from '../features/Metrics-Tracking/saveEditSessions/saveEditSessions.routes.js';
import diagnosticDensityRoutes from '../features/Metrics-Tracking/diagnosticDensity/diagnosticDensity.routes.js';
import errorFixTimeRoutes from '../features/Metrics-Tracking/errorFixTime/errorFixTime.routes.js';
import taskRunsRoutes from '../features/Metrics-Tracking/taskRuns/taskRuns.routes.js';
import commitEditSessionsRoutes from '../features/Metrics-Tracking/commitEditSessions/commitEditSessions.routes.js';
import idleSessionsRoutes from '../features/Metrics-Tracking/idleSessions/idleSessions.routes.js';
import dailyMetricsRoutes from '../features/Metrics-Tracking/dailyMetrics/dailyMetrics.routes.js';
import productivityScoreRoutes from '../features/Metrics-Tracking/productivityScore/productivityScore.routes.js';
import authRoutes from '../features/auth/auth.routes.js';
import { errorHandler } from '../middlewares/error.js';

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_: Request, res: Response) => res.json({ ok: true }));

app.use('/api/products', productRoutes);
app.use('/api/file-switch', fileSwitchRoutes);
app.use('/api/focus-streaks', focusStreakRoutes);
app.use('/api/edit-sessions', editSessionsRoutes);
app.use('/api/save-edit-sessions', saveEditSessionsRoutes);
app.use('/api/diagnostic-density', diagnosticDensityRoutes);
app.use('/api/error-fix-time', errorFixTimeRoutes);
app.use('/api/task-runs', taskRunsRoutes);
app.use('/api/commit-edit-sessions', commitEditSessionsRoutes);
app.use('/api/idle-sessions', idleSessionsRoutes);
app.use('/api/daily-metrics', dailyMetricsRoutes);
app.use('/api/productivity-score', productivityScoreRoutes);
app.use('/api/auth', authRoutes);

app.use(errorHandler);

export default app;

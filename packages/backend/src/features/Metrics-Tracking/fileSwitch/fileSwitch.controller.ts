import { Request, Response, NextFunction } from 'express';
import {
  validateCreatePayload,
  createFileSwitchWindow,
  getWindowsBySession,
  listSessionsByDate,
} from './fileSwitch.service.js';

export async function postFileSwitchWindow(req: Request, res: Response, next: NextFunction) {
  try {
    validateCreatePayload(req.body);
    const row = await createFileSwitchWindow(req.body);
    res.status(201).json({ ok: true, data: row });
  } catch (err) {
    next(err);
  }
}

export async function getFileSwitchWindows(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = String(req.query.sessionId || '');
    const userId = req.query.userId ? String(req.query.userId) : undefined;
    
    if (!sessionId) return res.status(400).json({ ok: false, error: 'sessionId query param is required' });

    const rows = await getWindowsBySession(sessionId, userId);
    return res.json({ ok: true, data: rows });
  } catch (err) {
    return next(err);
  }
}

export async function getFileSwitchSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const date = String(req.query.date || '');
    const userId = req.query.userId ? String(req.query.userId) : undefined;
    
    if (!date) return res.status(400).json({ ok: false, error: 'date query param is required (YYYY-MM-DD)' });

    const rows = await listSessionsByDate(date, userId);
    return res.json({ ok: true, data: rows });
  } catch (err) {
    return next(err);
  }
}

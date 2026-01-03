import { Request, Response } from 'express';
import { errorFixTimeService } from './errorFixTime.service';

export const errorFixTimeController = {
  async createSession(req: Request, res: Response): Promise<Response> {
    try {
      const session = await errorFixTimeService.createSession(req.body);
      return res.status(201).json(session);
    } catch (error) {
      console.error('Error creating error fix session:', error);
      return res.status(500).json({ error: 'Failed to create session' });
    }
  },

  async getStats(req: Request, res: Response): Promise<Response> {
    try {
      const { userId, severity } = req.query;

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'userId is required' });
      }

      const validSeverity = severity === 'error' || severity === 'warning' ? severity : undefined;
      const stats = await errorFixTimeService.getStats(userId, validSeverity);
      return res.json(stats);
    } catch (error) {
      console.error('Error fetching error fix stats:', error);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }
  },
};
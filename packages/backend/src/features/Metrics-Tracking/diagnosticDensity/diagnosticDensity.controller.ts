import { Request, Response } from 'express';
import { diagnosticDensityService } from './diagnosticDensity.service';

export const diagnosticDensityController = {
  async createSession(req: Request, res: Response): Promise<Response> {
    try {
      const session = await diagnosticDensityService.createSession(req.body);
      return res.status(201).json(session);
    } catch (error) {
      console.error('Error creating diagnostic density session:', error);
      return res.status(500).json({ error: 'Failed to create session' });
    }
  },

  async getBestSessions(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.query;

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'userId is required' });
      }

      const sessions = await diagnosticDensityService.getBestSessions(userId);
      return res.json(sessions);
    } catch (error) {
      console.error('Error fetching best diagnostic density sessions:', error);
      return res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  },
};

import { Request, Response } from 'express';
import saveEditSessionsService from './saveEditSessions.service';
import { CreateSaveEditSessionInput } from './saveEditSessions.types';

class SaveEditSessionsController {
  async createSession(req: Request, res: Response) {
    try {
      const input: CreateSaveEditSessionInput = req.body;
      const session = await saveEditSessionsService.createSession(input);
      return res.status(201).json(session);
    } catch (error) {
      console.error('Error creating save-edit session:', error);
      return res.status(500).json({ error: 'Failed to create save-edit session' });
    }
  }

  async getBestSessions(req: Request, res: Response) {
    try {
      const { userId, limit, startDate, endDate } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const params = {
        userId: userId as string,
        limit: limit ? parseInt(limit as string) : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const sessions = await saveEditSessionsService.getBestSessions(params);
      return res.json(sessions);
    } catch (error) {
      console.error('Error getting best save-edit sessions:', error);
      return res.status(500).json({ error: 'Failed to get best save-edit sessions' });
    }
  }

  async getBestSession(req: Request, res: Response) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const session = await saveEditSessionsService.getBestSession(userId as string);
      return res.json(session);
    } catch (error) {
      console.error('Error getting best save-edit session:', error);
      return res.status(500).json({ error: 'Failed to get best save-edit session' });
    }
  }
}

export default new SaveEditSessionsController();

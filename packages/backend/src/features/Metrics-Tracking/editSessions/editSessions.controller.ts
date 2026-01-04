import { Request, Response } from 'express';
import editSessionsService from './editSessions.service';
import { CreateEditSessionInput } from './editSessions.types';

class EditSessionsController {
  async createEditSession(req: Request, res: Response) {
    try {
      const input: CreateEditSessionInput = req.body;
      const session = await editSessionsService.createEditSession(input);
      return res.status(201).json(session);
    } catch (error) {
      console.error('Error creating edit session:', error);
      return res.status(500).json({ error: 'Failed to create edit session' });
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

      const sessions = await editSessionsService.getBestSessions(params);
      return res.json(sessions);
    } catch (error) {
      console.error('Error getting best sessions:', error);
      return res.status(500).json({ error: 'Failed to get best sessions' });
    }
  }

  async getBestSession(req: Request, res: Response) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const session = await editSessionsService.getBestSession(userId as string);
      return res.json(session);
    } catch (error) {
      console.error('Error getting best session:', error);
      return res.status(500).json({ error: 'Failed to get best session' });
    }
  }

  async getTop3Sessions(req: Request, res: Response) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const sessions = await editSessionsService.getTop3Sessions(userId as string);
      return res.json(sessions);
    } catch (error) {
      console.error('Error getting top 3 sessions:', error);
      return res.status(500).json({ error: 'Failed to get top 3 sessions' });
    }
  }
}

export default new EditSessionsController();

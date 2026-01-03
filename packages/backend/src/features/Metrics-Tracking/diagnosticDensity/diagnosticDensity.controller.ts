import { Request, Response } from 'express';
import { diagnosticDensityService } from './diagnosticDensity.service';

export const diagnosticDensityController = {
  async createEvent(req: Request, res: Response): Promise<Response> {
    try {
      const event = await diagnosticDensityService.createEvent(req.body);
      return res.status(201).json(event);
    } catch (error) {
      console.error('Error creating diagnostic density event:', error);
      return res.status(500).json({ error: 'Failed to create event' });
    }
  },

  async getExtremes(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.query;

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'userId is required' });
      }

      const extremes = await diagnosticDensityService.getExtremes(userId);
      return res.json(extremes);
    } catch (error) {
      console.error('Error fetching diagnostic density extremes:', error);
      return res.status(500).json({ error: 'Failed to fetch extremes' });
    }
  },
};

import { Request, Response } from 'express';
import focusStreakService from './focusStreak.service';
import { CreateFocusStreakInput } from './focusStreak.types';

class FocusStreakController {
  async createFocusStreak(req: Request, res: Response) {
    try {
      const input: CreateFocusStreakInput = req.body;
      const streak = await focusStreakService.createFocusStreak(input);
      return res.status(201).json(streak);
    } catch (error) {
      console.error('Error creating focus streak:', error);
      return res.status(500).json({ error: 'Failed to create focus streak' });
    }
  }

  async createMany(req: Request, res: Response) {
    try {
      const inputs: CreateFocusStreakInput[] = req.body.streaks || req.body;
      
      if (!Array.isArray(inputs)) {
        return res.status(400).json({ error: 'Expected array of streaks' });
      }

      const streaks = await focusStreakService.createMany(inputs);
      return res.status(201).json(streaks);
    } catch (error) {
      console.error('Error creating focus streaks:', error);
      return res.status(500).json({ error: 'Failed to create focus streaks' });
    }
  }

  async getBestStreaks(req: Request, res: Response) {
    try {
      const { userId, type, language, limit, startDate, endDate } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const params = {
        userId: userId as string,
        type: type as 'global' | 'per_file' | undefined,
        language: language as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const streaks = await focusStreakService.getBestStreaks(params);
      return res.json(streaks);
    } catch (error) {
      console.error('Error getting best streaks:', error);
      return res.status(500).json({ error: 'Failed to get best streaks' });
    }
  }

  async getBestGlobalStreak(req: Request, res: Response) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const streak = await focusStreakService.getBestGlobalStreak(userId as string);
      return res.json(streak);
    } catch (error) {
      console.error('Error getting best global streak:', error);
      return res.status(500).json({ error: 'Failed to get best global streak' });
    }
  }

  async getBestPerFileStreaks(req: Request, res: Response) {
    try {
      const { userId, limit } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const streaks = await focusStreakService.getBestPerFileStreaks(
        userId as string,
        limit ? parseInt(limit as string) : 10
      );
      return res.json(streaks);
    } catch (error) {
      console.error('Error getting best per-file streaks:', error);
      return res.status(500).json({ error: 'Failed to get best per-file streaks' });
    }
  }
}

export default new FocusStreakController();

import { Request, Response } from 'express';
import * as productivityScoreService from './productivityScore.service';

export const getScore = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, date } = req.query;

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    if (!date || typeof date !== 'string') {
      res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
      return;
    }

    const score = await productivityScoreService.getScore(userId, date);

    if (!score) {
      res.status(404).json({ error: 'No productivity score found for this date' });
      return;
    }

    res.json(score);
  } catch (error) {
    console.error('Error getting productivity score:', error);
    res.status(500).json({ error: 'Failed to get productivity score' });
  }
};

export const getScoreRange = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, startDate, endDate } = req.query;

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    if (!startDate || typeof startDate !== 'string') {
      res.status(400).json({ error: 'startDate is required (YYYY-MM-DD)' });
      return;
    }

    if (!endDate || typeof endDate !== 'string') {
      res.status(400).json({ error: 'endDate is required (YYYY-MM-DD)' });
      return;
    }

    const scores = await productivityScoreService.getScoreRange(userId, startDate, endDate);
    res.json(scores);
  } catch (error) {
    console.error('Error getting productivity score range:', error);
    res.status(500).json({ error: 'Failed to get productivity score range' });
  }
};

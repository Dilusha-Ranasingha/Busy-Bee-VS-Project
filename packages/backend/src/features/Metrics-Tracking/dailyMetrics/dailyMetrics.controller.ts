import { Request, Response } from 'express';
import * as dailyMetricsService from './dailyMetrics.service';

export const getDailyMetrics = async (req: Request, res: Response): Promise<void> => {
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

    const metrics = await dailyMetricsService.getDailyMetrics(userId, date);
    
    if (!metrics) {
      res.status(404).json({ error: 'No metrics found for this date' });
      return;
    }

    res.json(metrics);
  } catch (error) {
    console.error('Error getting daily metrics:', error);
    res.status(500).json({ error: 'Failed to get daily metrics' });
  }
};

export const getDailyMetricsRange = async (req: Request, res: Response): Promise<void> => {
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

    const metrics = await dailyMetricsService.getDailyMetricsRange(userId, startDate, endDate);
    res.json(metrics);
  } catch (error) {
    console.error('Error getting daily metrics range:', error);
    res.status(500).json({ error: 'Failed to get daily metrics range' });
  }
};

export const triggerAggregation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, userId } = req.body;

    if (!date || typeof date !== 'string') {
      res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
      return;
    }

    if (userId && typeof userId === 'string') {
      // Trigger for specific user
      await dailyMetricsService.triggerUserDailyAggregation(userId, date);
      res.json({ message: `Aggregation triggered for user ${userId} on ${date}` });
    } else {
      // Trigger for all users
      await dailyMetricsService.triggerDailyAggregation(date);
      res.json({ message: `Aggregation triggered for all users on ${date}` });
    }
  } catch (error) {
    console.error('Error triggering aggregation:', error);
    res.status(500).json({ error: 'Failed to trigger aggregation' });
  }
};

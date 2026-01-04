import { Request, Response } from 'express';
import * as idleSessionsService from './idleSessions.service';

export const createSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      sessionId,
      userId,
      workspaceId,
      startTs,
      endTs,
      durationMin,
      thresholdMin,
      endedReason,
    } = req.body;

    // Validate required fields
    if (!sessionId || !userId || !startTs || !endTs || durationMin === undefined || thresholdMin === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Validate duration >= 15 min
    if (durationMin < 15) {
      res.status(400).json({ error: 'Duration must be >= 15 minutes' });
      return;
    }

    const session = await idleSessionsService.createSession({
      sessionId,
      userId,
      workspaceId,
      startTs,
      endTs,
      durationMin,
      thresholdMin,
      endedReason,
    });

    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating idle session:', error);
    res.status(500).json({ error: 'Failed to create idle session' });
  }
};

export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const stats = await idleSessionsService.getStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting idle stats:', error);
    res.status(500).json({ error: 'Failed to get idle stats' });
  }
};

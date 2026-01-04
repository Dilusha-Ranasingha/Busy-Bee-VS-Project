import { Request, Response } from 'express';
import { taskRunsService } from './taskRuns.service';

export const taskRunsController = {
  async createRun(req: Request, res: Response) {
    try {
      const {
        userId,
        workspaceId,
        label,
        kind,
        startTs,
        endTs,
        durationSec,
        result,
        pid,
        isWatchLike,
      } = req.body;

      if (!userId || !label || !kind || !startTs || !endTs || durationSec == null || !result) {
        return res.status(400).json({
          error: 'Missing required fields: userId, label, kind, startTs, endTs, durationSec, result',
        });
      }

      if (!['test', 'build'].includes(kind)) {
        return res.status(400).json({ error: 'kind must be test or build' });
      }

      if (!['pass', 'fail', 'cancelled'].includes(result)) {
        return res.status(400).json({ error: 'result must be pass, fail, or cancelled' });
      }

      const taskRun = await taskRunsService.createRun({
        userId,
        workspaceId,
        label,
        kind,
        startTs,
        endTs,
        durationSec,
        result,
        pid,
        isWatchLike,
      });

      return res.status(201).json(taskRun);
    } catch (error) {
      console.error('Error creating task run:', error);
      return res.status(500).json({ error: 'Failed to create task run' });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const { userId, excludeWatchLike, since } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const exclude = excludeWatchLike === 'false' ? false : true;
      const stats = await taskRunsService.getStats(
        userId as string,
        exclude,
        since as string | undefined
      );

      return res.json(stats);
    } catch (error) {
      console.error('Error getting task run stats:', error);
      return res.status(500).json({ error: 'Failed to get task run stats' });
    }
  },
};

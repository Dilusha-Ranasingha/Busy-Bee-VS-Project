import { Request, Response } from 'express';
import { commitEditSessionsService } from './commitEditSessions.service';

export const commitEditSessionsController = {
  async createSession(req: Request, res: Response) {
    try {
      const {
        sessionId,
        userId,
        workspaceId,
        startTs,
        endTs,
        timeToCommitMin,
        editsPerCommit,
        charsAddedPerCommit,
        charsDeletedPerCommit,
        filesInCommit,
        linesAdded,
        linesDeleted,
        repoId,
        commitSha,
        aborted,
      } = req.body;

      if (
        !sessionId ||
        !userId ||
        !startTs ||
        !endTs ||
        timeToCommitMin == null ||
        editsPerCommit == null ||
        charsAddedPerCommit == null ||
        charsDeletedPerCommit == null ||
        filesInCommit == null
      ) {
        return res.status(400).json({
          error:
            'Missing required fields: sessionId, userId, startTs, endTs, timeToCommitMin, editsPerCommit, charsAddedPerCommit, charsDeletedPerCommit, filesInCommit',
        });
      }

      const session = await commitEditSessionsService.createSession({
        sessionId,
        userId,
        workspaceId,
        startTs,
        endTs,
        timeToCommitMin,
        editsPerCommit,
        charsAddedPerCommit,
        charsDeletedPerCommit,
        filesInCommit,
        linesAdded,
        linesDeleted,
        repoId,
        commitSha,
        aborted,
      });

      return res.status(201).json(session);
    } catch (error) {
      console.error('Error creating commit-edit session:', error);
      return res.status(500).json({ error: 'Failed to create commit-edit session' });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const stats = await commitEditSessionsService.getStats(userId as string);

      return res.json(stats);
    } catch (error) {
      console.error('Error getting commit-edit stats:', error);
      return res.status(500).json({ error: 'Failed to get commit-edit stats' });
    }
  },
};

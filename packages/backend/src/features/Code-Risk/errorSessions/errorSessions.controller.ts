import { Request, Response } from 'express';
import { ErrorSessionsService } from './errorSessions.service';
import { CreateErrorSessionPayload } from './errorSessions.types';

export class ErrorSessionsController {
  /**
   * Create a new error session
   * POST /api/code-risk/error-sessions
   */
  static async createSession(req: Request, res: Response): Promise<void> {
    try {
      const payload: CreateErrorSessionPayload = req.body;

      // Validate required fields
      if (!payload.session_id || !payload.user_id || !payload.file_uri) {
        res.status(400).json({ 
          error: 'Missing required fields: session_id, user_id, file_uri' 
        });
        return;
      }

      if (payload.error_count_session <= 0) {
        res.status(400).json({ 
          error: 'error_count_session must be greater than 0' 
        });
        return;
      }

      const session = await ErrorSessionsService.createSession(payload);
      
      res.status(201).json(session);
    } catch (error) {
      console.error('Error creating error session:', error);
      res.status(500).json({ 
        error: 'Failed to create error session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get error sessions by user
   * GET /api/code-risk/error-sessions/user/:userId
   */
  static async getSessionsByUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      const sessions = await ErrorSessionsService.getSessionsByUser(userId, limit);
      
      res.status(200).json(sessions);
    } catch (error) {
      console.error('Error fetching error sessions:', error);
      res.status(500).json({ 
        error: 'Failed to fetch error sessions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get error sessions by file
   * GET /api/code-risk/error-sessions/file
   */
  static async getSessionsByFile(req: Request, res: Response): Promise<void> {
    try {
      const { fileUri } = req.query;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!fileUri || typeof fileUri !== 'string') {
        res.status(400).json({ 
          error: 'Missing or invalid fileUri query parameter' 
        });
        return;
      }

      const sessions = await ErrorSessionsService.getSessionsByFile(fileUri, limit);
      
      res.status(200).json(sessions);
    } catch (error) {
      console.error('Error fetching error sessions by file:', error);
      res.status(500).json({ 
        error: 'Failed to fetch error sessions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get recent sessions (last 24 hours)
   * GET /api/code-risk/error-sessions/user/:userId/recent
   */
  static async getRecentSessions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const sessions = await ErrorSessionsService.getRecentSessions(userId);
      
      res.status(200).json(sessions);
    } catch (error) {
      console.error('Error fetching recent error sessions:', error);
      res.status(500).json({ 
        error: 'Failed to fetch recent error sessions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get pending sessions (not sent to Gemini)
   * GET /api/code-risk/error-sessions/pending
   */
  static async getPendingSessions(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const sessions = await ErrorSessionsService.getPendingSessions(limit);
      
      res.status(200).json(sessions);
    } catch (error) {
      console.error('Error fetching pending error sessions:', error);
      res.status(500).json({ 
        error: 'Failed to fetch pending error sessions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

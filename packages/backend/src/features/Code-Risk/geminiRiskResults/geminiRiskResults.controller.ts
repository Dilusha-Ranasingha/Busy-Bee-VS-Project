import { Request, Response } from 'express';
import { GeminiRiskResultsService } from './geminiRiskResults.service';

export class GeminiRiskResultsController {
  /**
   * Create risk result from error session (triggers Gemini API call)
   * POST /api/code-risk/risk-results/from-session/:errorSessionId
   */
  static async createFromErrorSession(req: Request, res: Response): Promise<void> {
    try {
      const { errorSessionId } = req.params;

      if (!errorSessionId) {
        res.status(400).json({ 
          error: 'Missing errorSessionId parameter' 
        });
        return;
      }

      const result = await GeminiRiskResultsService.createFromErrorSession(errorSessionId);
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating risk result from error session:', error);
      res.status(500).json({ 
        error: 'Failed to create risk result',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get active risk results for a user
   * GET /api/code-risk/risk-results/user/:userId/active
   */
  static async getActiveResultsByUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const results = await GeminiRiskResultsService.getActiveResultsByUser(userId);
      
      res.status(200).json(results);
    } catch (error) {
      console.error('Error fetching active risk results:', error);
      res.status(500).json({ 
        error: 'Failed to fetch active risk results',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get active risk result for a specific file
   * GET /api/code-risk/risk-results/user/:userId/file
   */
  static async getActiveResultByFile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { fileUri } = req.query;

      if (!fileUri || typeof fileUri !== 'string') {
        res.status(400).json({ 
          error: 'Missing or invalid fileUri query parameter' 
        });
        return;
      }

      const result = await GeminiRiskResultsService.getActiveResultByFile(userId, fileUri);
      
      if (!result) {
        res.status(404).json({ 
          error: 'No active risk result found for this file' 
        });
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching active risk result by file:', error);
      res.status(500).json({ 
        error: 'Failed to fetch active risk result',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all risk results for a user
   * GET /api/code-risk/risk-results/user/:userId
   */
  static async getAllResultsByUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      const results = await GeminiRiskResultsService.getAllResultsByUser(userId, limit);
      
      res.status(200).json(results);
    } catch (error) {
      console.error('Error fetching all risk results:', error);
      res.status(500).json({ 
        error: 'Failed to fetch risk results',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Deactivate risk results for a specific file
   * POST /api/code-risk/risk-results/user/:userId/deactivate-file
   */
  static async deactivateResultsForFile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { fileUri } = req.body;

      if (!fileUri) {
        res.status(400).json({ 
          error: 'Missing fileUri in request body' 
        });
        return;
      }

      await GeminiRiskResultsService.deactivateResultsForFile(userId, fileUri);
      
      res.status(200).json({ 
        message: 'Risk results deactivated successfully',
        fileUri 
      });
    } catch (error) {
      console.error('Error deactivating risk results:', error);
      res.status(500).json({ 
        error: 'Failed to deactivate risk results',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Deactivate a specific result
   * POST /api/code-risk/risk-results/:id/deactivate
   */
  static async deactivateResult(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await GeminiRiskResultsService.deactivateResult(id);
      
      res.status(200).json({ 
        message: 'Risk result deactivated successfully',
        id 
      });
    } catch (error) {
      console.error('Error deactivating risk result:', error);
      res.status(500).json({ 
        error: 'Failed to deactivate risk result',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

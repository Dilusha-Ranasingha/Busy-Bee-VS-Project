import type { Request, Response } from "express";
import { TodoTrackerService } from "./todoTracker.service";
import { validateAnalyzeRequest, validateAssociateRequest, validateEnrichRequest, validateSummarizeRequest } from "./validation";

export class TodoTrackerController {
  constructor(private readonly service: TodoTrackerService) {}

  health = async (_req: Request, res: Response) => {
    return res.status(200).json({ status: "ok", feature: "todo-tracker" });
  };

  enrich = async (req: Request, res: Response) => {
    try {
      const input = validateEnrichRequest(req.body);
      const out = await this.service.enrichTodos(input);
      return res.status(200).json(out);
    } catch (err: any) {
      return res.status(400).json({ error: "BadRequest", message: err?.message ?? "Invalid request" });
    }
  };

  analyze = async (req: Request, res: Response) => {
    try {
      const input = validateAnalyzeRequest(req.body);
      const out = await this.service.analyzeTodo(input);
      return res.status(200).json(out);
    } catch (err: any) {
      return res.status(400).json({ error: "BadRequest", message: err?.message ?? "Invalid request" });
    }
  };

  associate = async (req: Request, res: Response) => {
    try {
      const input = validateAssociateRequest(req.body);
      const out = await this.service.associateFiles(input);
      return res.status(200).json(out);
    } catch (err: any) {
      return res.status(400).json({ error: "BadRequest", message: err?.message ?? "Invalid request" });
    }
  };

  summarize = async (req: Request, res: Response) => {
    try {
      const input = validateSummarizeRequest(req.body);
      const out = await this.service.summarizeTodos(input);
      return res.status(200).json(out);
    } catch (err: any) {
      return res.status(400).json({ error: "BadRequest", message: err?.message ?? "Invalid request" });
    }
  };
}

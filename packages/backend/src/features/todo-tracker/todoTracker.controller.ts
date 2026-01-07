import type { Request, Response } from "express";
import { TodoTrackerService } from "./todoTracker.service";
import { validateAnalyzeRequest, validateAssociateRequest, validateEnrichRequest, validateSummarizeRequest, validateSyncProjectRequest } from "./validation";
import { getPool } from "../../config/db.js";

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

  // Persist (upsert) project + todos into Postgres tables
  syncProject = async (req: Request, res: Response) => {
    const client = await getPool().connect();
    try {
      const input = validateSyncProjectRequest(req.body);

      console.info(`[todo-tracker] sync project=${input.projectId} todos=${input.todos.length}`);

      await client.query("BEGIN");

      await client.query(
        `INSERT INTO projects (project_id, project_name)
         VALUES ($1, $2)
         ON CONFLICT (project_id) DO UPDATE SET project_name = EXCLUDED.project_name`,
        [input.projectId, input.projectName ?? null]
      );

      for (const t of input.todos) {
        const urgencyScoreInt = Number.isFinite(t.urgencyScore) ? Math.round((t.urgencyScore as number) * 100) : null;

        await client.query(
          `INSERT INTO todos (
             id, project_id, text, file_path, line,
             status, priority, labels, deadline_iso, urgency_score,
             updated_at
           ) VALUES (
             $1,$2,$3,$4,$5,
             $6,$7,$8,$9,$10,
             NOW()
           )
           ON CONFLICT (id) DO UPDATE SET
             project_id = EXCLUDED.project_id,
             text = EXCLUDED.text,
             file_path = EXCLUDED.file_path,
             line = EXCLUDED.line,
             status = EXCLUDED.status,
             priority = EXCLUDED.priority,
             labels = EXCLUDED.labels,
             deadline_iso = EXCLUDED.deadline_iso,
             urgency_score = EXCLUDED.urgency_score,
             updated_at = NOW(),
             resolved_at = CASE
               WHEN EXCLUDED.status = 'resolved' THEN COALESCE(todos.resolved_at, NOW())
               ELSE todos.resolved_at
             END`,
          [
            t.id,
            input.projectId,
            t.text,
            t.filePath,
            t.line,
            t.status,
            t.priority ?? null,
            t.labels ?? null,
            t.deadlineISO ?? null,
            urgencyScoreInt,
          ]
        );
      }

      await client.query("COMMIT");
      console.info(`[todo-tracker] sync committed project=${input.projectId} upserted=${input.todos.length}`);
      return res.status(200).json({ ok: true, upserted: input.todos.length });
    } catch (err: any) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ignore rollback errors
      }
      return res.status(400).json({ error: "BadRequest", message: err?.message ?? "Invalid request" });
    } finally {
      client.release();
    }
  };

  // List projects (for extension project selection)
  listProjects = async (_req: Request, res: Response) => {
    const client = await getPool().connect();
    try {
      const r = await client.query(
        `SELECT project_id, project_name, created_at
         FROM projects
         ORDER BY created_at DESC
         LIMIT 200`
      );
      console.info(`[todo-tracker] listProjects count=${r.rowCount}`);
      return res.status(200).json({ projects: r.rows });
    } catch (err: any) {
      return res.status(400).json({ error: "BadRequest", message: err?.message ?? "Invalid request" });
    } finally {
      client.release();
    }
  };

  // Fetch todos for a project (pull from DB)
  getProjectTodos = async (req: Request, res: Response) => {
    const projectId = String(req.params.projectId ?? "").trim();
    if (!projectId) {
      return res.status(400).json({ error: "BadRequest", message: "projectId is required" });
    }

    const client = await getPool().connect();
    try {
      const r = await client.query(
        `SELECT id, project_id, text, file_path, line, status, priority, labels, deadline_iso, urgency_score, created_at, updated_at
         FROM todos
         WHERE project_id = $1
         ORDER BY updated_at DESC`,
        [projectId]
      );

      const todos = r.rows.map((row: any) => ({
        id: row.id,
        text: row.text,
        filePath: row.file_path,
        line: row.line,
        status: row.status,
        priority: row.priority ?? undefined,
        labels: row.labels ?? undefined,
        deadlineISO: row.deadline_iso ?? null,
        urgencyScore: Number.isFinite(row.urgency_score) ? Number(row.urgency_score) / 100 : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      console.info(`[todo-tracker] getProjectTodos project=${projectId} count=${todos.length}`);
      return res.status(200).json({ projectId, todos });
    } catch (err: any) {
      return res.status(400).json({ error: "BadRequest", message: err?.message ?? "Invalid request" });
    } finally {
      client.release();
    }
  };
}

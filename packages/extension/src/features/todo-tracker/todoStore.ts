import { Logger } from "../../logger/logger";

export class TodoStore {
  private db: any = { meta: { schemaVersion: 1 }, todos: [] };
  constructor(private readonly logger: Logger) {}

  setDb(db: any) {
    this.db = db;
  }

  getDb() {
    return this.db;
  }

  replaceAll(todos: any[]) {
    this.db.todos = todos.map((t) => ({
      ...t,
      status: t.status ?? "open",
    }));
  }

  add(todo: any) {
    this.db.todos = [...this.db.todos, todo];
    this.logger.info(`[TODO] add manual todo id=${todo?.id}`);
  }

  upsertFromFile(filePath: string, parsedTodos: any[]) {
    const allExisting: any[] = Array.isArray(this.db.todos) ? this.db.todos : [];

    // Keep todos not belonging to this file (includes manual todos).
    const keep = allExisting.filter((t: any) => t.filePath !== filePath);

    // For this file, preserve user state (resolved/in_progress) and enrichment fields.
    const prevInFile = allExisting.filter((t: any) => t.filePath === filePath);
    const prevById = new Map<string, any>(prevInFile.map((t: any) => [t.id, t]));

    const merged = parsedTodos.map((p: any) => {
      const prev = prevById.get(p.id);
      if (!prev) {
        return p;
      }
      return {
        ...p,
        status: prev.status ?? p.status,
        priority: prev.priority ?? p.priority,
        labels: prev.labels ?? p.labels,
        deadlineISO: prev.deadlineISO ?? p.deadlineISO,
        urgencyScore: prev.urgencyScore ?? p.urgencyScore,
        suggestedFiles: prev.suggestedFiles ?? p.suggestedFiles,
        source: prev.source ?? p.source,
        createdAt: prev.createdAt ?? p.createdAt,
        updatedAt: new Date().toISOString(),
      };
    });

    this.db.todos = [...keep, ...merged];
    this.logger.info(`[TODO] upsertFromFile ${filePath} parsed=${parsedTodos.length} kept=${keep.length}`);
  }

  getRecentTouchedTodos(filePath: string) {
    return this.db.todos.filter((t: any) => t.filePath === filePath);
  }

  mergeEnrichment(enrichResponse: any) {
    const map = new Map<string, any>();
    for (const t of enrichResponse.todos ?? []) {
      map.set(t.id, t);
    }

    this.db.todos = this.db.todos.map((t: any) => {
      const e = map.get(t.id);
      if (!e) {
        return t;
      }
      return {
        ...t,
        // Never clobber user-entered fields with enrichment.
        // Enrichment should act as a best-effort "fill missing data" layer.
        priority: t.priority ?? e.priority,
        labels: Array.isArray(t.labels) && t.labels.length ? t.labels : e.labels,
        deadlineISO: (t.deadlineISO ?? undefined) !== undefined ? t.deadlineISO : e.deadlineISO,
        urgencyScore: Number.isFinite(t.urgencyScore) ? t.urgencyScore : e.urgencyScore,
        suggestedFiles: Array.isArray(t.suggestedFiles) && t.suggestedFiles.length ? t.suggestedFiles : e.suggestedFiles,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  markResolved(id: string) {
    this.db.todos = this.db.todos.map((t: any) =>
      t.id === id ? { ...t, status: "resolved", updatedAt: new Date().toISOString() } : t
    );
  }
}

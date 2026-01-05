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

  upsertFromFile(filePath: string, parsedTodos: any[]) {
    const existing = this.db.todos.filter((t: any) => t.filePath !== filePath);
    this.db.todos = [...existing, ...parsedTodos];
    this.logger.info(`[TODO] upsertFromFile ${filePath} parsed=${parsedTodos.length}`);
  }

  getRecentTouchedTodos(filePath: string) {
    return this.db.todos.filter((t: any) => t.filePath === filePath);
  }

  mergeEnrichment(enrichResponse: any) {
    const map = new Map<string, any>();
    for (const t of enrichResponse.todos ?? []) map.set(t.id, t);

    this.db.todos = this.db.todos.map((t: any) => {
      const e = map.get(t.id);
      if (!e) return t;
      return {
        ...t,
        priority: e.priority,
        labels: e.labels,
        deadlineISO: e.deadlineISO,
        urgencyScore: e.urgencyScore,
        suggestedFiles: e.suggestedFiles,
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

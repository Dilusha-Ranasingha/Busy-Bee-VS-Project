import { Logger } from "../../logger/logger";

export function createTodoNlpClient(logger: Logger) {
  const baseUrl = process.env.BUSYBEE_BACKEND_URL ?? "http://localhost:5050";

  async function enrich(payload: any) {
    try {
      const res = await fetch(`${baseUrl}/api/todo-tracker/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Backend enrich failed: ${res.status} ${txt}`);
      }

      return await res.json();
    } catch (e: any) {
      // If backend is down, return baseline (no enrichment) so extension still works
      logger.warn(`[TODO] NLP backend unavailable, using baseline. (${e?.message ?? e})`);
      return {
        todos: payload.todos.map((t: any) => ({
          ...t,
          priority: "medium",
          labels: [],
          deadlineISO: null,
          urgencyScore: 0.3,
          suggestedFiles: [],
          modelMeta: { mode: "baseline", version: "offline" },
        })),
      };
    }
  }

  return { enrich };
}

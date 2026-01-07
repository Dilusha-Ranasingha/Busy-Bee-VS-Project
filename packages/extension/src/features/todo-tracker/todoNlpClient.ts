import { Logger } from "../../logger/logger";
import * as http from "http";
import * as https from "https";

export function createTodoNlpClient(logger: Logger) {
  const baseUrl = process.env.BUSYBEE_BACKEND_URL ?? "http://localhost:5693";

  async function httpRequest(url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) {
    const u = new URL(url);
    const lib = u.protocol === "https:" ? https : http;

    const method = init?.method ?? "GET";
    const headers = init?.headers ?? {};
    const body = init?.body;

    return new Promise<{ status: number; ok: boolean; text: () => Promise<string>; json: () => Promise<any> }>((resolve, reject) => {
      const req = lib.request(
        {
          protocol: u.protocol,
          hostname: u.hostname,
          port: u.port,
          path: `${u.pathname}${u.search}`,
          method,
          headers: {
            ...(body ? { "Content-Length": Buffer.byteLength(body).toString() } : {}),
            ...headers,
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(String(d))));
          res.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf8");
            const status = res.statusCode ?? 0;
            resolve({
              status,
              ok: status >= 200 && status < 300,
              text: async () => raw,
              json: async () => {
                try {
                  return JSON.parse(raw);
                } catch {
                  return null;
                }
              },
            });
          });
        }
      );
      req.on("error", reject);
      if (body) {
        req.write(body);
      }
      req.end();
    });
  }

  async function request(url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) {
    const f = (globalThis as any).fetch;
    if (typeof f === "function") {
      return f(url, init as any);
    }
    return httpRequest(url, init);
  }

  async function enrich(payload: any) {
    try {
      const res = await request(`${baseUrl}/api/todo-tracker/enrich`, {
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

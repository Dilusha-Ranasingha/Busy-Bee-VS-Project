import * as vscode from "vscode";
import { Logger } from "../../logger/logger";
import { parseTodosFromText } from "./todoParser";
import { scanWorkspaceTodos, scanSingleDocumentTodos } from "./todoScanner";
import { TodoStore } from "./todoStore";
import { createTodoNlpClient } from "./todoNlpClient";
import { randomUUID } from "crypto";
import * as http from "http";
import * as https from "https";

export interface TodoItem {
  id: string;
  text: string;
  filePath: string;
  line: number;
  status: "open" | "in_progress" | "resolved";
  source?: "scan" | "manual";
  priority?: "low" | "medium" | "high" | "urgent";
  labels?: string[];
  deadlineISO?: string | null;
  urgencyScore?: number;
  suggestedFiles?: Array<{ path: string; score: number }>;
  createdAt: string;
  updatedAt: string;
}

export interface TodoDb {
  meta: { schemaVersion: number; projectId: string; projectName: string; updatedAt: string; backend?: { lastSyncAt?: string } };
  todos: TodoItem[];
}

export interface TodoTrackerController {
  init(): Promise<void>;
  onActiveEditorChanged(editor?: vscode.TextEditor): Promise<void>;
  onDocumentSaved(doc: vscode.TextDocument): Promise<void>;
  scanWorkspaceNow(): Promise<void>;
  syncProjectNow(): Promise<void>;
  getProjectInfo(): { projectId: string | null; projectName: string | null };
  updateTodo(input: { id: string; patch: Partial<Omit<TodoItem, "id" | "createdAt" | "updatedAt">> }): Promise<void>;
  addManualTodo(input: string | {
    text: string;
    filePath: string;
    line: number;
    status?: "open" | "in_progress" | "resolved";
    priority?: "low" | "medium" | "high" | "urgent";
    labels?: string[];
    deadlineISO?: string | null;
    urgencyScore?: number;
  }): Promise<void>;
  getTodos(): TodoItem[];
  markResolved(id: string): Promise<void>;
}

export function createTodoTrackerController(deps: {
  context: vscode.ExtensionContext;
  logger: Logger;
  projectResolver: { getActiveProjectContext(): any };
  storageManager: { load(projectId: string, workspaceRoot: vscode.Uri): Promise<any>; save(projectId: string, workspaceRoot: vscode.Uri, data: any): Promise<any> };
}): TodoTrackerController {
  const { logger, projectResolver, storageManager } = deps;

  const store = new TodoStore(logger);
  const nlpClient = createTodoNlpClient(logger);

  const backendBaseUrl = process.env.BUSYBEE_BACKEND_URL ?? "http://localhost:5693";

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

  let activeProjectId: string | null = null;
  let activeWorkspaceRoot: vscode.Uri | null = null;
  let activeProjectName: string | null = null;

  const WORKSPACE_BINDINGS_KEY = "busyBee.todo.projectBindings";

  type ProjectBinding = { projectId: string; projectName: string | null };

  function getWorkspaceBindings(): Record<string, ProjectBinding> {
    const raw = deps.context.workspaceState.get<Record<string, ProjectBinding>>(WORKSPACE_BINDINGS_KEY);
    return raw ?? {};
  }

  async function setWorkspaceBinding(workspaceFsPath: string, binding: ProjectBinding) {
    const current = getWorkspaceBindings();
    current[workspaceFsPath] = binding;
    await deps.context.workspaceState.update(WORKSPACE_BINDINGS_KEY, current);
  }

  function getWorkspaceBinding(workspaceFsPath: string): ProjectBinding | null {
    const current = getWorkspaceBindings();
    return current[workspaceFsPath] ?? null;
  }

  async function fetchProjectsFromBackend(): Promise<Array<{ project_id: string; project_name: string | null }>> {
    try {
      const res = await request(`${backendBaseUrl}/api/todo-tracker/projects`, { method: "GET" });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`list projects failed: ${res.status} ${txt}`);
      }
      const json = await res.json();
      const projects = Array.isArray(json?.projects) ? json.projects : [];
      return projects;
    } catch (e: any) {
      logger.warn(`[TODO] Backend list projects unavailable (${e?.message ?? e})`);
      void vscode.window.showWarningMessage(
        `Busy Bee backend not reachable. Start it with: npm run dev (repo root). (${e?.message ?? e})`
      );
      return [];
    }
  }

  async function fetchTodosFromBackend(projectId: string): Promise<TodoItem[] | null> {
    try {
      const res = await request(`${backendBaseUrl}/api/todo-tracker/projects/${encodeURIComponent(projectId)}/todos`, { method: "GET" });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`get todos failed: ${res.status} ${txt}`);
      }
      const json = await res.json();
      const todos = Array.isArray(json?.todos) ? json.todos : [];
      return todos as TodoItem[];
    } catch (e: any) {
      logger.warn(`[TODO] Backend fetch todos unavailable (${e?.message ?? e})`);
      void vscode.window.showWarningMessage(
        `Busy Bee backend not reachable. Can't load todos from DB. (${e?.message ?? e})`
      );
      return null;
    }
  }

  function mergeTodos(localTodos: TodoItem[], remoteTodos: TodoItem[]): TodoItem[] {
    const byId = new Map<string, TodoItem>();
    for (const t of remoteTodos) {
      byId.set(t.id, t);
    }

    for (const t of localTodos) {
      const existing = byId.get(t.id);
      if (!existing) {
        byId.set(t.id, t);
        continue;
      }
      const a = Date.parse(String(existing.updatedAt ?? ""));
      const b = Date.parse(String(t.updatedAt ?? ""));
      byId.set(t.id, Number.isFinite(a) && Number.isFinite(b) ? (b > a ? t : existing) : t);
    }

    return [...byId.values()].sort(
      (x, y) => Date.parse(String(y.updatedAt ?? "")) - Date.parse(String(x.updatedAt ?? ""))
    );
  }

  async function ensureProjectLoaded() {
    const ctx = projectResolver.getActiveProjectContext();
    if (!ctx) {
      return;
    }

    const { projectId: defaultProjectId, workspaceRoot, projectName: defaultProjectName } = ctx;

    const binding = getWorkspaceBinding(workspaceRoot.fsPath);
    const projectId = binding?.projectId ?? defaultProjectId;
    const projectName = binding?.projectName ?? defaultProjectName;

    if (activeProjectId === projectId) {
      return;
    }

    // switch project
    activeProjectId = projectId;
    activeWorkspaceRoot = workspaceRoot;
    activeProjectName = projectName;

    const loaded = await storageManager.load(projectId, workspaceRoot);
    const db: TodoDb =
      loaded.data ??
      {
        meta: {
          schemaVersion: 1,
          projectId,
          projectName,
          updatedAt: new Date().toISOString(),
        },
        todos: [],
      };

    store.setDb(db);
    logger.info(`[TODO] Project switched: ${projectName} (${projectId}) storage=${loaded.mode}`);
  }

  async function ensureProjectSelectedForSync() {
    await ensureProjectLoaded();
    if (!activeWorkspaceRoot) {
      return;
    }
    if (!activeProjectId) {
      return;
    }

    const db = store.getDb() as TodoDb;

    // If this workspace already has a binding, don't re-prompt.
    const existingBinding = getWorkspaceBinding(activeWorkspaceRoot.fsPath);
    if (existingBinding) {
      return;
    }

    // Fetch known projects from backend (best-effort).
    const projects = await fetchProjectsFromBackend();

    interface ProjectPickItem extends vscode.QuickPickItem {
      mode: "existing" | "create";
      projectId?: string;
      projectName?: string | null;
    }

    const picks: ProjectPickItem[] = [
      { label: "Create new project for this workspace", description: "Stores under this workspace", mode: "create" },
      ...projects.map((p) => ({
        label: p.project_name ? String(p.project_name) : p.project_id,
        description: p.project_id,
        projectId: p.project_id,
        projectName: p.project_name ?? null,
        mode: "existing" as const,
      })),
    ];

    const chosen = await vscode.window.showQuickPick<ProjectPickItem>(picks, {
      title: "Select a project to sync",
      placeHolder: "Choose an existing DB project or create a new one",
      ignoreFocusOut: true,
    });

    if (!chosen) {
      return;
    }

    if (chosen.mode === "create") {
      const entered = await vscode.window.showInputBox({
        title: "Create Project",
        prompt: "Enter project name",
        value: activeProjectName ?? "",
        validateInput: (v) => (v.trim().length ? undefined : "Project name is required"),
      });

      if (!entered) {
        return;
      }

      await setWorkspaceBinding(activeWorkspaceRoot.fsPath, {
        projectId: activeProjectId,
        projectName: entered.trim(),
      });

      // Update meta + persist so we remember name.
      db.meta.projectName = entered.trim();
      activeProjectName = entered.trim();
      await persist();
      logger.info(`[TODO] Bound workspace to new project ${activeProjectId} (${activeProjectName})`);
      return;
    }

    // Existing project chosen: bind workspace to that projectId and pull DB todos.
    const newProjectId = chosen.projectId;
    if (!newProjectId) {
      return;
    }

    await setWorkspaceBinding(activeWorkspaceRoot.fsPath, {
      projectId: newProjectId,
      projectName: chosen.projectName ?? chosen.label,
    });

    // Switch active project to selected ID and load storage for it.
    activeProjectId = newProjectId;
    activeProjectName = chosen.projectName ?? chosen.label;

    const pid = activeProjectId;
    if (!pid) {
      return;
    }

    const loaded = await storageManager.load(pid, activeWorkspaceRoot);
    const nextDb: TodoDb =
      loaded.data ??
      {
        meta: {
          schemaVersion: 1,
          projectId: pid,
          projectName: activeProjectName,
          updatedAt: new Date().toISOString(),
        },
        todos: [],
      };
    store.setDb(nextDb);

    const remoteTodos = await fetchTodosFromBackend(pid);
    if (remoteTodos) {
      store.replaceAll(remoteTodos);
      await persist();
    }

    logger.info(`[TODO] Bound workspace to existing project ${activeProjectId} (${activeProjectName}) remoteTodos=${remoteTodos?.length ?? 0}`);
  }

  async function persist() {
    if (!activeProjectId || !activeWorkspaceRoot || !activeProjectName) {
      return;
    }

    const db = store.getDb();
    db.meta.updatedAt = new Date().toISOString();

    const mode = await storageManager.save(activeProjectId, activeWorkspaceRoot, db);
    logger.info(`[TODO] Persisted DB (${mode}) todos=${db.todos.length}`);
  }

  async function enrichAndMerge(todos: TodoItem[]) {
    if (!activeProjectId || !activeWorkspaceRoot) {
      return;
    }

    // candidate files list is optional, but improves association
    const candidateFiles = await scanWorkspaceTodos.listCandidateFiles(activeWorkspaceRoot);

    const enriched = await nlpClient.enrich({
      projectId: activeProjectId,
      topK: 5,
      candidateFiles: candidateFiles.slice(0, 500), // limit to reduce payload
      todos: todos.map(t => ({
        id: t.id,
        text: t.text,
        filePath: t.filePath,
        status: t.status,
      })),
    });

    store.mergeEnrichment(enriched);
  }

  async function syncToBackend() {
    // Project selection may switch active project and replace the store DB,
    // so do it BEFORE capturing the DB payload.
    await ensureProjectSelectedForSync();

    if (!activeProjectId || !activeProjectName) {
      return;
    }

    const db = store.getDb() as TodoDb;

    try {
      const res = await request(`${backendBaseUrl}/api/todo-tracker/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProjectId,
          projectName: activeProjectName,
          todos: db.todos,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Backend sync failed: ${res.status} ${txt}`);
      }

      db.meta.backend = { ...(db.meta.backend ?? {}), lastSyncAt: new Date().toISOString() };
      await persist();
      logger.info(`[TODO] Synced project to backend todos=${db.todos.length}`);
    } catch (e: any) {
      // Offline-first: backend sync is best-effort
      logger.warn(`[TODO] Backend sync unavailable (${e?.message ?? e})`);
      void vscode.window.showWarningMessage(
        `Busy Bee backend not reachable. Nothing was written to Postgres. (${e?.message ?? e})`
      );
    }
  }

  return {
    async init() {
      await ensureProjectLoaded();
    },

    async onActiveEditorChanged(editor?: vscode.TextEditor) {
      await ensureProjectLoaded();

      // optional: context-based reminder triggers later
      void editor;
    },

    async onDocumentSaved(doc: vscode.TextDocument) {
      await ensureProjectLoaded();
      if (!activeWorkspaceRoot) {
        return;
      }
      if (!activeProjectId) {
        return;
      }

      // Parse TODOs from this file (incremental)
      const relPath = vscode.workspace.asRelativePath(doc.uri, false);
      const extracted = parseTodosFromText(doc.getText(), activeProjectId, relPath);

      store.upsertFromFile(relPath, extracted);

      // Enrich (AI/ML) + persist
      await enrichAndMerge(store.getRecentTouchedTodos(relPath));
      await persist();

      // Best-effort DB sync so backend sees traffic and DB stays updated
      await syncToBackend();
    },

    async scanWorkspaceNow() {
      await ensureProjectLoaded();
      if (!activeWorkspaceRoot) {
        return;
      }
      if (!activeProjectId) {
        return;
      }

      logger.info(`[TODO] scanWorkspaceNow project=${activeProjectId}`);

      const scanned = await scanWorkspaceTodos(activeWorkspaceRoot, activeProjectId);
      const db = store.getDb() as TodoDb;
      const existing: TodoItem[] = Array.isArray(db.todos) ? db.todos : [];

      const existingById = new Map<string, TodoItem>(existing.map((t) => [t.id, t]));
      const mergedScanned: TodoItem[] = scanned.map((t: any) => {
        const prev = existingById.get(t.id);
        if (!prev) {
          return { ...t, source: t.source ?? "scan" };
        }

        // If user edited this todo, keep the edited version instead of overwriting with fresh scan text.
        if (prev.source === "manual") {
          return { ...prev, updatedAt: new Date().toISOString() };
        }

        return {
          ...t,
          status: prev.status ?? t.status,
          priority: prev.priority ?? t.priority,
          labels: prev.labels ?? t.labels,
          deadlineISO: prev.deadlineISO ?? t.deadlineISO,
          urgencyScore: prev.urgencyScore ?? t.urgencyScore,
          suggestedFiles: prev.suggestedFiles ?? t.suggestedFiles,
          source: prev.source ?? t.source ?? "scan",
          createdAt: prev.createdAt ?? t.createdAt,
          updatedAt: new Date().toISOString(),
        };
      });

      const manualTodos = existing.filter((t) => t.source === "manual" || t.filePath === "__manual__");
      store.replaceAll([...manualTodos, ...mergedScanned]);

      await enrichAndMerge(scanned);
      await persist();

      // Best-effort DB sync so Scan writes to DB too
      await syncToBackend();
    },

    async syncProjectNow() {
      await ensureProjectLoaded();

      // If not yet bound, ask to select/create. Then pull from DB and push local state.
      await ensureProjectSelectedForSync();
      if (activeProjectId) {
        const remoteTodos = await fetchTodosFromBackend(activeProjectId);
        if (remoteTodos) {
          const db = store.getDb() as TodoDb;
          store.replaceAll(mergeTodos(db.todos ?? [], remoteTodos));
          await persist();
          logger.info(`[TODO] Pulled todos from backend count=${remoteTodos.length}`);
        }
      }

      logger.info(`[TODO] syncProjectNow project=${activeProjectId ?? "-"}`);
      await syncToBackend();
    },

    getProjectInfo() {
      const db = store.getDb() as TodoDb;
      return {
        projectId: typeof db?.meta?.projectId === "string" ? db.meta.projectId : activeProjectId,
        projectName: typeof db?.meta?.projectName === "string" ? db.meta.projectName : activeProjectName,
      };
    },

    async updateTodo(input: { id: string; patch: any }) {
      await ensureProjectLoaded();
      await ensureProjectSelectedForSync();

      const id = String(input?.id ?? "").trim();
      if (!id) {
        throw new Error("Todo id is required");
      }

      const patch = input?.patch ?? {};
      const db = store.getDb() as TodoDb;
      const todos: TodoItem[] = Array.isArray(db.todos) ? db.todos : [];
      const idx = todos.findIndex((t) => t.id === id);
      if (idx < 0) {
        throw new Error("Todo not found");
      }

      const prev = todos[idx];
      const now = new Date().toISOString();

      const next: TodoItem = {
        ...prev,
        text: typeof patch.text === "string" ? patch.text.trim() : prev.text,
        filePath: typeof patch.filePath === "string" ? patch.filePath.trim() : prev.filePath,
        line: Number.isFinite(patch.line) ? Number(patch.line) : prev.line,
        status: typeof patch.status === "string" ? patch.status : prev.status,
        priority: typeof patch.priority === "string" ? patch.priority : prev.priority,
        labels: Array.isArray(patch.labels) ? patch.labels : prev.labels,
        deadlineISO:
          patch.deadlineISO === null
            ? null
            : typeof patch.deadlineISO === "string"
            ? patch.deadlineISO
            : prev.deadlineISO,
        urgencyScore: Number.isFinite(patch.urgencyScore)
          ? (Number(patch.urgencyScore) > 1 ? Number(patch.urgencyScore) / 100 : Number(patch.urgencyScore))
          : prev.urgencyScore,
        // If a scanned todo is edited, treat it as a manual override so future scans don't overwrite it.
        source: "manual",
        updatedAt: now,
      };

      todos[idx] = next;
      db.todos = todos;
      store.setDb(db);

      await enrichAndMerge([next]);
      await persist();
      await syncToBackend();

      logger.info(`[TODO] updateTodo id=${id}`);
    },

    async addManualTodo(input: any) {
      await ensureProjectLoaded();
      if (!activeProjectId) {
        return;
      }

      await ensureProjectSelectedForSync();

      const payload = typeof input === "string"
        ? { text: input, filePath: "__manual__", line: 0 }
        : input;

      const rawText = String(payload?.text ?? "").trim();
      const rawFilePath = String(payload?.filePath ?? "").trim();
      const rawLine = Number(payload?.line ?? 0);
      const status = (payload?.status ?? "open") as TodoItem["status"];

      if (!rawText) {
        throw new Error("Todo text is required");
      }
      if (!rawFilePath) {
        throw new Error("File path is required");
      }
      if (!Number.isFinite(rawLine) || rawLine < 0) {
        throw new Error("Line must be a non-negative number");
      }

      const now = new Date().toISOString();
      const todo: TodoItem = {
        id: randomUUID(),
        text: rawText,
        filePath: rawFilePath,
        line: rawLine,
        status,
        source: "manual",
        priority: payload?.priority,
        labels: Array.isArray(payload?.labels) ? payload.labels : undefined,
        deadlineISO: payload?.deadlineISO ?? undefined,
        urgencyScore: Number.isFinite(payload?.urgencyScore)
          ? (Number(payload.urgencyScore) > 1 ? Number(payload.urgencyScore) / 100 : Number(payload.urgencyScore))
          : undefined,
        createdAt: now,
        updatedAt: now,
      };

      store.add(todo);
      await enrichAndMerge([todo]);
      await persist();
      await syncToBackend();

      logger.info(`[TODO] addManualTodo id=${todo.id} file=${todo.filePath}:${todo.line}`);
    },

    getTodos() {
      return store.getDb().todos;
    },

    async markResolved(id: string) {
      store.markResolved(id);
      await persist();

      // Best-effort DB sync so resolves are persisted
      await syncToBackend();

      logger.info(`[TODO] markResolved id=${id}`);
    },
  };
}

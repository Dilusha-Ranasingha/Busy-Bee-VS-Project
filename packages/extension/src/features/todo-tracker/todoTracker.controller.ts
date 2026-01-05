import * as vscode from "vscode";
import { Logger } from "../../logger/logger";
import { parseTodosFromText } from "./todoParser";
import { scanWorkspaceTodos, scanSingleDocumentTodos } from "./todoScanner";
import { TodoStore } from "./todoStore";
import { createTodoNlpClient } from "./todoNlpClient";

export interface TodoItem {
  id: string;
  text: string;
  filePath: string;
  line: number;
  status: "open" | "in_progress" | "resolved";
  priority?: "low" | "medium" | "high" | "urgent";
  labels?: string[];
  deadlineISO?: string | null;
  urgencyScore?: number;
  suggestedFiles?: Array<{ path: string; score: number }>;
  createdAt: string;
  updatedAt: string;
}

export interface TodoDb {
  meta: { schemaVersion: number; projectId: string; projectName: string; updatedAt: string };
  todos: TodoItem[];
}

export interface TodoTrackerController {
  init(): Promise<void>;
  onActiveEditorChanged(editor?: vscode.TextEditor): Promise<void>;
  onDocumentSaved(doc: vscode.TextDocument): Promise<void>;
  scanWorkspaceNow(): Promise<void>;
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

  let activeProjectId: string | null = null;
  let activeWorkspaceRoot: vscode.Uri | null = null;
  let activeProjectName: string | null = null;

  async function ensureProjectLoaded() {
    const ctx = projectResolver.getActiveProjectContext();
    if (!ctx) return;

    const { projectId, workspaceRoot, projectName } = ctx;

    if (activeProjectId === projectId) return;

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

  async function persist() {
    if (!activeProjectId || !activeWorkspaceRoot || !activeProjectName) return;

    const db = store.getDb();
    db.meta.updatedAt = new Date().toISOString();

    const mode = await storageManager.save(activeProjectId, activeWorkspaceRoot, db);
    logger.info(`[TODO] Persisted DB (${mode}) todos=${db.todos.length}`);
  }

  async function enrichAndMerge(todos: TodoItem[]) {
    if (!activeProjectId || !activeWorkspaceRoot) return;

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
      if (!activeWorkspaceRoot) return;

      // Parse TODOs from this file (incremental)
      const relPath = vscode.workspace.asRelativePath(doc.uri, false);
      const extracted = parseTodosFromText(doc.getText(), relPath);

      store.upsertFromFile(relPath, extracted);

      // Enrich (AI/ML) + persist
      await enrichAndMerge(store.getRecentTouchedTodos(relPath));
      await persist();
    },

    async scanWorkspaceNow() {
      await ensureProjectLoaded();
      if (!activeWorkspaceRoot) return;

      const scanned = await scanWorkspaceTodos(activeWorkspaceRoot);
      store.replaceAll(scanned);

      await enrichAndMerge(scanned);
      await persist();
    },

    getTodos() {
      return store.getDb().todos;
    },

    async markResolved(id: string) {
      store.markResolved(id);
      await persist();
    },
  };
}

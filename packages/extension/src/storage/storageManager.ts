import * as vscode from "vscode";
import { Logger } from "../logger/logger";
import { WorkspaceStorage } from "./workspaceStorage";
import { ExtensionStorage } from "./extensionStorage";
import { migrateTodoDb } from "./migrations";

export type StorageMode = "WORKSPACE" | "EXTENSION";

export interface StorageResult<T> {
  mode: StorageMode;
  data: T;
}

export interface StorageManager<T> {
  load(projectId: string, workspaceRoot: vscode.Uri): Promise<StorageResult<T | null>>;
  save(projectId: string, workspaceRoot: vscode.Uri, data: T): Promise<StorageMode>;
}

export function createStorageManager(context: vscode.ExtensionContext, logger: Logger) {
  const workspace = new WorkspaceStorage(logger);
  const extension = new ExtensionStorage(context, logger);

  async function load(projectId: string, workspaceRoot: vscode.Uri) {
    // Try workspace first
    try {
      const data = await workspace.read(workspaceRoot);
      if (data) {
        const m = migrateTodoDb(data);
        if (m.migrated) {
          await workspace.write(workspaceRoot, m.value);
          logger.info(`[storage] migrated workspace DB for project=${projectId}`);
        }
        return { mode: "WORKSPACE" as const, data: m.value };
      }
      return { mode: "WORKSPACE" as const, data: null };
    } catch (e) {
      logger.warn(`Workspace storage read failed. Falling back to extension storage. (${String(e)})`);
    }

    const data = await extension.read(projectId);
    if (data) {
      const m = migrateTodoDb(data);
      if (m.migrated) {
        await extension.write(projectId, m.value);
        logger.info(`[storage] migrated extension DB for project=${projectId}`);
      }
      return { mode: "EXTENSION" as const, data: m.value };
    }
    return { mode: "EXTENSION" as const, data: null };
  }

  async function save(projectId: string, workspaceRoot: vscode.Uri, data: any) {
    // Try workspace first
    try {
      await workspace.write(workspaceRoot, data);
      return "WORKSPACE" as const;
    } catch (e) {
      logger.warn(`Workspace storage write failed. Falling back to extension storage. (${String(e)})`);
      await extension.write(projectId, data);
      return "EXTENSION" as const;
    }
  }

  return { load, save };
}

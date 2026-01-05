import * as vscode from "vscode";
import { createHash } from "crypto";
import { Logger } from "../logger/logger";

export interface ProjectContext {
  workspaceRoot: vscode.Uri;
  projectName: string;
  projectId: string;
}

export function createProjectContextResolver(logger: Logger) {
  function hashPath(p: string) {
    return createHash("sha256").update(p).digest("hex").slice(0, 12);
  }

  function resolveFromUri(uri?: vscode.Uri): ProjectContext | null {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return null;

    // Prefer folder containing the active file
    if (uri) {
      const folder = vscode.workspace.getWorkspaceFolder(uri);
      if (folder) {
        const fsPath = folder.uri.fsPath;
        return {
          workspaceRoot: folder.uri,
          projectName: folder.name,
          projectId: hashPath(fsPath),
        };
      }
    }

    // fallback: first workspace folder
    const first = folders[0];
    return {
      workspaceRoot: first.uri,
      projectName: first.name,
      projectId: hashPath(first.uri.fsPath),
    };
  }

  function getActiveProjectContext(): ProjectContext | null {
    const activeUri = vscode.window.activeTextEditor?.document?.uri;
    const ctx = resolveFromUri(activeUri);
    if (!ctx) logger.warn("No workspace folder detected. TODO tracker disabled.");
    return ctx;
  }

  return {
    resolveFromUri,
    getActiveProjectContext,
  };
}

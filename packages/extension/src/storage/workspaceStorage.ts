import * as vscode from "vscode";
import { Logger } from "../logger/logger";
import { atomicWriteFile } from "./atomicWriter";

const STORAGE_DIR = ".vscode/busy-bee-todo";
const FILE_NAME = "todos.json";

export class WorkspaceStorage<T = any> {
  constructor(private readonly logger: Logger) {}

  private getPath(workspaceRoot: vscode.Uri) {
    return vscode.Uri.joinPath(workspaceRoot, STORAGE_DIR, FILE_NAME);
  }

  async read(workspaceRoot: vscode.Uri): Promise<T | null> {
    const fileUri = this.getPath(workspaceRoot);
    try {
      const bytes = await vscode.workspace.fs.readFile(fileUri);
      const txt = Buffer.from(bytes).toString("utf8");
      return JSON.parse(txt) as T;
    } catch (e: any) {
      // If file missing -> return null (not an error)
      if (String(e?.message ?? e).toLowerCase().includes("file not found")) return null;
      // Otherwise throw to allow fallback
      throw e;
    }
  }

  async write(workspaceRoot: vscode.Uri, data: T): Promise<void> {
    const fileUri = this.getPath(workspaceRoot);
    const dirUri = vscode.Uri.joinPath(workspaceRoot, STORAGE_DIR);

    // ensure dir exists
    await vscode.workspace.fs.createDirectory(dirUri);

    const txt = JSON.stringify(data, null, 2);
    await atomicWriteFile(fileUri, Buffer.from(txt, "utf8"));

    this.logger.debug(`[storage] workspace write OK: ${fileUri.fsPath}`);
  }
}

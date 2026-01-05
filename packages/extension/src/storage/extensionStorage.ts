import * as vscode from "vscode";
import { Logger } from "../logger/logger";
import { atomicWriteFile } from "./atomicWriter";

const FILE_NAME = "todos.json";

export class ExtensionStorage<T = any> {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly logger: Logger
  ) {}

  private getDir(projectId: string) {
    return vscode.Uri.joinPath(this.context.globalStorageUri, projectId);
  }

  private getPath(projectId: string) {
    return vscode.Uri.joinPath(this.getDir(projectId), FILE_NAME);
  }

  async read(projectId: string): Promise<T | null> {
    const fileUri = this.getPath(projectId);
    try {
      const bytes = await vscode.workspace.fs.readFile(fileUri);
      const txt = Buffer.from(bytes).toString("utf8");
      return JSON.parse(txt) as T;
    } catch (e: any) {
      if (String(e?.message ?? e).toLowerCase().includes("file not found")) return null;
      throw e;
    }
  }

  async write(projectId: string, data: T): Promise<void> {
    const dirUri = this.getDir(projectId);
    await vscode.workspace.fs.createDirectory(dirUri);

    const fileUri = this.getPath(projectId);
    const txt = JSON.stringify(data, null, 2);
    await atomicWriteFile(fileUri, Buffer.from(txt, "utf8"));

    this.logger.debug(`[storage] extension write OK: ${fileUri.fsPath}`);
  }
}

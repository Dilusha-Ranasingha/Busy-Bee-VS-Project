import * as vscode from "vscode";
import { parseTodosFromText, ParsedTodo } from "./todoParser";

export async function scanWorkspaceTodos(workspaceRoot: vscode.Uri, projectId: string): Promise<any[]> {
  // scan text files; adjust include patterns later
  const files = await vscode.workspace.findFiles(
    new vscode.RelativePattern(workspaceRoot, "**/*.{ts,tsx,js,jsx,py,java,cs,go,php,rb,md}"),
    "**/{node_modules,dist,build,out,.git,.vscode}/**",
    2000
  );

  const all: any[] = [];
  for (const uri of files) {
    const doc = await vscode.workspace.openTextDocument(uri);
    const relPath = vscode.workspace.asRelativePath(uri, false);
    const parsed = parseTodosFromText(doc.getText(), projectId, relPath);
    all.push(...parsed);
  }
  return all;
}

// helper used by controller
scanWorkspaceTodos.listCandidateFiles = async (workspaceRoot: vscode.Uri) => {
  const files = await vscode.workspace.findFiles(
    new vscode.RelativePattern(workspaceRoot, "**/*.{ts,tsx,js,jsx,py,java,cs,go,php,rb,md}"),
    "**/{node_modules,dist,build,out,.git}/**",
    3000
  );

  return files.map((u) => ({
    path: vscode.workspace.asRelativePath(u, false),
  }));
};

export async function scanSingleDocumentTodos(doc: vscode.TextDocument, projectId: string): Promise<ParsedTodo[]> {
  const relPath = vscode.workspace.asRelativePath(doc.uri, false);
  return parseTodosFromText(doc.getText(), projectId, relPath);
}

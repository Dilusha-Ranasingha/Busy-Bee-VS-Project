import * as vscode from "vscode";

export async function atomicWriteFile(
  target: vscode.Uri,
  content: Uint8Array
): Promise<void> {
  const dir = vscode.Uri.joinPath(target, "..");
  const base = target.path.split("/").pop() ?? "file";
  const tmp = vscode.Uri.joinPath(dir, `.${base}.tmp-${Date.now()}`);

  await vscode.workspace.fs.writeFile(tmp, content);

  // delete old file if exists, then rename temp to target
  try {
    await vscode.workspace.fs.delete(target, { useTrash: false });
  } catch {
    // ignore if doesn't exist
  }
  await vscode.workspace.fs.rename(tmp, target, { overwrite: true });
}

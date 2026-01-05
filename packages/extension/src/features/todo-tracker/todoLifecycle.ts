import { createHash } from "crypto";

export type TodoStatus = "open" | "in_progress" | "resolved";

export function stableTodoId(projectId: string, filePath: string, line: number, text: string) {
  // Stable across rescans as long as file path + line + core text match
  const core = `${projectId}|${filePath}|${line}|${normalize(text)}`;
  return createHash("sha1").update(core).digest("hex");
}

export function normalize(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function markResolved(todo: any) {
  return { ...todo, status: "resolved" as TodoStatus, updatedAt: new Date().toISOString() };
}

export function markInProgress(todo: any) {
  return { ...todo, status: "in_progress" as TodoStatus, updatedAt: new Date().toISOString() };
}

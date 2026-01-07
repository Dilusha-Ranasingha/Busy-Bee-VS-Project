import { createHash } from "crypto";

export function sha1Hex(input: string): string {
  return createHash("sha1").update(input).digest("hex");
}

export function stableTodoId(projectId: string, filePath: string, line: number, text: string): string {
  const core = `${projectId}|${filePath}|${line}|${normalize(text)}`;
  return sha1Hex(core);
}

export function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

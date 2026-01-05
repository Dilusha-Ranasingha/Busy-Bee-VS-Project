import { randomUUID } from "crypto";

export interface ParsedTodo {
  id: string;
  text: string;
  filePath: string;
  line: number;
  status: "open";
  createdAt: string;
  updatedAt: string;
}

const TODO_PATTERNS = [
  /TODO[:\s-]+(.+)/i,
  /FIXME[:\s-]+(.+)/i,
  /BUG[:\s-]+(.+)/i,
];

export function parseTodosFromText(text: string, filePath: string): ParsedTodo[] {
  const lines = text.split(/\r?\n/);
  const now = new Date().toISOString();
  const todos: ParsedTodo[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    for (const pat of TODO_PATTERNS) {
      const m = lineText.match(pat);
      if (m && m[1]) {
        todos.push({
          id: randomUUID(),
          text: m[1].trim(),
          filePath,
          line: i + 1,
          status: "open",
          createdAt: now,
          updatedAt: now,
        });
        break;
      }
    }
  }

  return todos;
}

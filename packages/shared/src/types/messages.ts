import type { TodoDb, TodoItem } from "./todo";

export type TodoWebviewToExtension =
  | { type: "TODO/GET" }
  | { type: "TODO/SCAN" }
  | { type: "TODO/SYNC_PROJECT" }
  | { type: "TODO/PICK_FILE" }
  | {
      type: "TODO/ADD_MANUAL";
      payload:
        | { text: string }
        | {
            text: string;
            filePath: string;
            line: number;
            status?: "open" | "in_progress" | "resolved";
            priority?: "low" | "medium" | "high" | "urgent";
            labels?: string[];
            deadlineISO?: string | null;
            urgencyScore?: number;
          };
    }
  | {
      type: "TODO/UPDATE";
      payload: {
        id: string;
        patch: {
          text?: string;
          filePath?: string;
          line?: number;
          status?: "open" | "in_progress" | "resolved";
          priority?: "low" | "medium" | "high" | "urgent";
          labels?: string[];
          deadlineISO?: string | null;
          urgencyScore?: number;
        };
      };
    }
  | { type: "TODO/MARK_RESOLVED"; payload: { id: string } }
  | { type: "TODO/OPEN_FILE"; payload: { filePath: string; line?: number } };

export type TodoExtensionToWebview =
  | { type: "TODO/STATE"; payload: { projectId: string | null; projectName: string | null; todos: TodoItem[] } }
  | { type: "TODO/FILE_PICKED"; payload: { filePath: string | null } }
  | { type: "TODO/ERROR"; payload: { message: string } };

export function isTodoWebviewMessage(x: any): x is TodoWebviewToExtension {
  return typeof x?.type === "string" && x.type.startsWith("TODO/");
}
